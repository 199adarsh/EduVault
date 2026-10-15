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
import java.util.List;
import java.util.UUID;

/**
 * Handles all file operations against Backblaze B2 via the
 * AWS SDK v2 S3-compatible API.
 *
 * Upload stores the object with ContentType and ContentLength metadata.
 * generatePresignedUrl returns a time-limited URL for private-bucket access.
 */
@Service
public class BackblazeStorageService {

    private static final Logger logger = LoggerFactory.getLogger(BackblazeStorageService.class);

    private final S3Client s3Client;
    private final S3Presigner s3Presigner;

    @Value("${app.b2.bucket-name}")
    private String bucketName;

    @Value("${app.b2.presigned-url-expiry-minutes:60}")
    private long presignedExpiryMinutes;

    @Value("${app.storage.local-dir:./data}")
    private String localDir;

    public BackblazeStorageService(S3Client s3Client, S3Presigner s3Presigner) {
        this.s3Client = s3Client;
        this.s3Presigner = s3Presigner;
    }

    /**
     * Uploads a {@link MultipartFile} to B2.
     *
     * @param file the uploaded file
     * @return the object key (UUID + original extension) stored in B2
     */
    public String uploadFile(MultipartFile file) {
        String originalName = file.getOriginalFilename();
        String ext = (originalName != null && originalName.contains("."))
                ? originalName.substring(originalName.lastIndexOf('.'))
                : "";
        String key = UUID.randomUUID() + ext;

        try {
            PutObjectRequest request = PutObjectRequest.builder()
                    .bucket(bucketName)
                    .key(key)
                    .contentType(resolveContentType(file, ext))
                    .contentLength(file.getSize())
                    .build();

            s3Client.putObject(request,
                    RequestBody.fromInputStream(file.getInputStream(), file.getSize()));

            logger.info("Uploaded file to B2: bucket={} key={} size={}", bucketName, key, file.getSize());
            return key;
        } catch (IOException e) {
            throw new RuntimeException("Failed to upload file to Backblaze B2: " + key, e);
        } catch (S3Exception e) {
            throw new RuntimeException("B2 S3 error during upload: " + e.awsErrorDetails().errorMessage(), e);
        }
    }

    public boolean checkB2Availability() {
        try {
            s3Client.headBucket(HeadBucketRequest.builder().bucket(bucketName).build());
            return true;
        } catch (S3Exception e) {
            if (e.statusCode() == 403) {
                logger.warn("B2 HTTP 403: Transaction/bandwidth cap or permissions issue detected: {}", e.awsErrorDetails().errorMessage());
            } else {
                logger.warn("B2 S3 check returned status {}: {}", e.statusCode(), e.awsErrorDetails().errorMessage());
            }
            return false;
        } catch (Exception e) {
            logger.warn("B2 check failed: {}", e.getMessage());
            return false;
        }
    }

    /**
     * Uploads raw bytes to B2 using the specified key.
     *
     * @param bytes the byte array to upload
     * @param key the object key (filename) to use in B2
     * @return object key in B2
     */
    public String uploadBytes(byte[] bytes, String key) {
        String ext = (key != null && key.contains("."))
                ? key.substring(key.lastIndexOf('.'))
                : "";

        try {
            PutObjectRequest request = PutObjectRequest.builder()
                    .bucket(bucketName)
                    .key(key)
                    .contentType(resolveContentTypeFromExt(ext))
                    .contentLength((long) bytes.length)
                    .build();

            s3Client.putObject(request, RequestBody.fromBytes(bytes));
            logger.info("Uploaded raw bytes to B2: bucket={} key={} size={}", bucketName, key, bytes.length);
            return key;
        } catch (S3Exception e) {
            if (e.statusCode() == 403) {
                logger.warn("B2 upload blocked (HTTP 403): {}", e.awsErrorDetails().errorMessage());
            } else {
                logger.warn("B2 S3 upload failed with code {}: {}", e.statusCode(), e.awsErrorDetails().errorMessage());
            }
            return null;
        } catch (Exception e) {
            logger.warn("B2 uploadBytes failed: {}. Continuing with local fallback.", e.getMessage());
            return null;
        }
    }

    /**
     * Verifies that the file exists in B2; if missing, searches local storage and uploads it.
     */
    public void ensureUploaded(String key) {
        if (key == null || key.isEmpty() || key.startsWith("http")) return;
        try {
            s3Client.headObject(HeadObjectRequest.builder().bucket(bucketName).key(key).build());
        } catch (Exception missingEx) {
            try {
                Path localPath = Paths.get(localDir).resolve(key).toAbsolutePath().normalize();
                if (!Files.exists(localPath)) {
                    localPath = Paths.get("./backend/data").resolve(key).toAbsolutePath().normalize();
                }
                if (!Files.exists(localPath)) {
                    localPath = Paths.get("./data").resolve(key).toAbsolutePath().normalize();
                }

                if (Files.exists(localPath) && Files.isRegularFile(localPath)) {
                    String ext = key.contains(".") ? key.substring(key.lastIndexOf('.')) : "";
                    PutObjectRequest request = PutObjectRequest.builder()
                            .bucket(bucketName)
                            .key(key)
                            .contentType(resolveContentTypeFromExt(ext))
                            .contentLength(Files.size(localPath))
                            .build();

                    s3Client.putObject(request, RequestBody.fromFile(localPath));
                    logger.info("Auto-synced local file to B2: key={} path={}", key, localPath);
                }
            } catch (Exception ex) {
                logger.warn("Failed to auto-sync local file {} to B2: {}", key, ex.getMessage());
            }
        }
    }

    public List<S3Object> listAllObjects() {
        try {
            ListObjectsV2Request request = ListObjectsV2Request.builder()
                    .bucket(bucketName)
                    .maxKeys(1000)
                    .build();
            ListObjectsV2Response response = s3Client.listObjectsV2(request);
            logger.info("Found {} objects in B2 bucket {}", response.contents().size(), bucketName);
            return response.contents();
        } catch (Exception e) {
            logger.error("Failed to list B2 objects: {}", e.getMessage(), e);
            return List.of();
        }
    }

    public byte[] getObjectBytes(String key) {
        try {
            GetObjectRequest request = GetObjectRequest.builder()
                    .bucket(bucketName)
                    .key(key)
                    .build();
            return s3Client.getObjectAsBytes(request).asByteArray();
        } catch (Exception e) {
            logger.warn("Failed to download B2 object {}: {}", key, e.getMessage());
            return null;
        }
    }

    /**
     * Deletes an object from B2 by key.
     *
     * @param key the object key to delete
     */
    public void deleteFile(String key) {
        try {
            s3Client.deleteObject(DeleteObjectRequest.builder()
                    .bucket(bucketName)
                    .key(key)
                    .build());
            logger.info("Deleted file from B2: bucket={} key={}", bucketName, key);
        } catch (S3Exception e) {
            logger.error("B2 S3 error during delete for key {}: {}", key, e.awsErrorDetails().errorMessage(), e);
        }
    }

    /**
     * Generates a presigned GET URL for a private B2 object.
     * Ensures the object is in B2 first.
     *
     * @param key the object key
     * @return time-limited presigned URL string
     */
    public String generatePresignedUrl(String key) {
        ensureUploaded(key);

        // Derive content type from file extension for inline display
        String ext = key.contains(".") ? key.substring(key.lastIndexOf('.')) : "";
        String contentType = resolveContentTypeFromExt(ext);

        GetObjectRequest getObjectRequest = GetObjectRequest.builder()
                .bucket(bucketName)
                .key(key)
                .responseContentDisposition("inline")
                .responseContentType(contentType)
                .build();

        GetObjectPresignRequest presignRequest = GetObjectPresignRequest.builder()
                .signatureDuration(Duration.ofMinutes(presignedExpiryMinutes))
                .getObjectRequest(getObjectRequest)
                .build();

        PresignedGetObjectRequest presigned = s3Presigner.presignGetObject(presignRequest);
        String url = presigned.url().toString();
        logger.info("Generated presigned URL for key={} expiry={}min contentType={}", key, presignedExpiryMinutes, contentType);
        return url;
    }

    private String resolveContentTypeFromExt(String ext) {
        return switch (ext.toLowerCase()) {
            case ".pdf"  -> "application/pdf";
            case ".docx" -> "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
            case ".doc"  -> "application/msword";
            case ".pptx" -> "application/vnd.openxmlformats-officedocument.presentationml.presentation";
            case ".ppt"  -> "application/vnd.ms-powerpoint";
            case ".png"  -> "image/png";
            case ".jpg", ".jpeg" -> "image/jpeg";
            default -> "application/octet-stream";
        };
    }

    // ---- helpers ----

    private String resolveContentType(MultipartFile file, String ext) {
        String ct = file.getContentType();
        if (ct != null && !ct.isBlank() && !ct.equals("application/octet-stream")) {
            return ct;
        }
        return switch (ext.toLowerCase()) {
            case ".pdf"  -> "application/pdf";
            case ".docx" -> "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
            case ".doc"  -> "application/msword";
            case ".pptx" -> "application/vnd.openxmlformats-officedocument.presentationml.presentation";
            case ".ppt"  -> "application/vnd.ms-powerpoint";
            case ".png"  -> "image/png";
            case ".jpg", ".jpeg" -> "image/jpeg";
            default -> "application/octet-stream";
        };
    }
}
