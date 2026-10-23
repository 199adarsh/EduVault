package com.eduvault.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.*;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedGetObjectRequest;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Duration;
import java.util.UUID;

/**
 * Dedicated storage service for NC (Absence Consideration) proof documents.
 * Isolates NC proof files into a separate Backblaze B2 bucket.
 */
@Service
public class NcBackblazeStorageService {

    private static final Logger logger = LoggerFactory.getLogger(NcBackblazeStorageService.class);

    private final S3Client s3Client;
    private final S3Presigner s3Presigner;

    @Value("${app.b2.bucket-name:eduvault-storage-a8f3}")
    private String primaryBucketName;

    @Value("${app.b2.nc-bucket-name:eduvault-nc-proofs}")
    private String ncBucketName;

    @Value("${app.b2.presigned-url-expiry-minutes:60}")
    private long presignedExpiryMinutes;

    @Value("${app.storage.local-dir:./data}")
    private String localDir;

    private volatile String effectiveBucket = null;

    public NcBackblazeStorageService(S3Client s3Client, S3Presigner s3Presigner) {
        this.s3Client = s3Client;
        this.s3Presigner = s3Presigner;
    }

    public String getNcBucketName() {
        return resolveEffectiveBucket();
    }

    private synchronized String resolveEffectiveBucket() {
        if (effectiveBucket != null) return effectiveBucket;

        String candidate = ncBucketName != null && !ncBucketName.isBlank() ? ncBucketName.toLowerCase() : "eduvault-nc-proofs";
        try {
            s3Client.headBucket(HeadBucketRequest.builder().bucket(candidate).build());
            effectiveBucket = candidate;
            return effectiveBucket;
        } catch (Exception ex) {
            try {
                s3Client.createBucket(CreateBucketRequest.builder().bucket(candidate).build());
                effectiveBucket = candidate;
                logger.info("Created dedicated NC bucket: {}", candidate);
                return effectiveBucket;
            } catch (Exception createEx) {
                logger.warn("Dedicated bucket '{}' unavailable: {}. Using primary bucket '{}'.",
                        candidate, createEx.getMessage(), primaryBucketName);
                effectiveBucket = primaryBucketName;
                return effectiveBucket;
            }
        }
    }

    /**
     * Uploads proof document to the dedicated NC Backblaze B2 bucket (with primary/local fallback).
     */
    public String uploadNcProof(MultipartFile file) {
        String originalName = file.getOriginalFilename();
        String ext = (originalName != null && originalName.contains("."))
                ? originalName.substring(originalName.lastIndexOf('.'))
                : "";
        String key = "nc-proof-" + UUID.randomUUID() + ext;

        // Local mirror backup for resiliency
        try {
            Path backupDir = Paths.get(localDir, "nc_proofs");
            Files.createDirectories(backupDir);
            Path targetPath = backupDir.resolve(key);
            Files.copy(file.getInputStream(), targetPath, java.nio.file.StandardCopyOption.REPLACE_EXISTING);
        } catch (Exception ex) {
            logger.warn("Local NC proof cache write failed: {}", ex.getMessage());
        }

        String targetBucket = resolveEffectiveBucket();
        try {
            PutObjectRequest request = PutObjectRequest.builder()
                    .bucket(targetBucket)
                    .key(key)
                    .contentType(resolveContentType(file, ext))
                    .contentLength(file.getSize())
                    .build();

            s3Client.putObject(request,
                    RequestBody.fromInputStream(file.getInputStream(), file.getSize()));

            logger.info("Uploaded NC proof: bucket={} key={} size={}",
                    targetBucket, key, file.getSize());
            return key;
        } catch (Exception e) {
            logger.warn("Direct B2 upload to bucket '{}' failed: {}. Retained in local fallback cache.",
                    targetBucket, e.getMessage());
            return key;
        }
    }

    /**
     * Generates a presigned URL if object is present on B2, otherwise provides backend proxy stream URL.
     */
    public String generatePresignedUrl(String key) {
        if (key == null || key.isBlank()) return null;

        String targetBucket = resolveEffectiveBucket();
        try {
            s3Client.headObject(HeadObjectRequest.builder().bucket(targetBucket).key(key).build());

            String ext = key.contains(".") ? key.substring(key.lastIndexOf('.')) : "";
            String contentType = resolveContentTypeFromExt(ext);

            GetObjectRequest getObjectRequest = GetObjectRequest.builder()
                    .bucket(targetBucket)
                    .key(key)
                    .responseContentDisposition("inline; filename=\"" + key + "\"")
                    .responseContentType(contentType)
                    .build();

            GetObjectPresignRequest presignRequest = GetObjectPresignRequest.builder()
                    .signatureDuration(Duration.ofMinutes(presignedExpiryMinutes))
                    .getObjectRequest(getObjectRequest)
                    .build();

            PresignedGetObjectRequest presigned = s3Presigner.presignGetObject(presignRequest);
            return presigned.url().toString();
        } catch (Exception ex) {
            return "/api/nc/proofs/" + key;
        }
    }

    /**
     * Retrieves raw file bytes either from B2 or local backup cache.
     */
    public byte[] getProofBytes(String key) {
        String targetBucket = resolveEffectiveBucket();
        try {
            GetObjectRequest request = GetObjectRequest.builder()
                    .bucket(targetBucket)
                    .key(key)
                    .build();
            return s3Client.getObjectAsBytes(request).asByteArray();
        } catch (Exception e) {
            try {
                Path localPath = Paths.get(localDir, "nc_proofs", key);
                if (Files.exists(localPath)) {
                    return Files.readAllBytes(localPath);
                }
            } catch (IOException io) {
                logger.error("Failed to read fallback NC file: {}", io.getMessage());
            }
            return null;
        }
    }

    private String resolveContentType(MultipartFile file, String ext) {
        String ct = file.getContentType();
        if (ct != null && !ct.isBlank() && !ct.equals("application/octet-stream")) {
            return ct;
        }
        return resolveContentTypeFromExt(ext);
    }

    public String resolveContentTypeFromExt(String ext) {
        return switch (ext.toLowerCase()) {
            case ".pdf"  -> "application/pdf";
            case ".png"  -> "image/png";
            case ".jpg", ".jpeg" -> "image/jpeg";
            case ".webp" -> "image/webp";
            default -> "application/octet-stream";
        };
    }
}
