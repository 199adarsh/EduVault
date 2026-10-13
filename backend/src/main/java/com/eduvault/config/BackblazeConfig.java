package com.eduvault.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3Configuration;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;

import java.net.URI;

/**
 * Configures the AWS SDK v2 S3Client and S3Presigner beans
 * that are pointed at the Backblaze B2 S3-compatible endpoint.
 *
 * All sensitive values are injected from environment variables:
 *   B2_ACCESS_KEY_ID, B2_SECRET_ACCESS_KEY
 */
@Configuration
public class BackblazeConfig {

    @Value("${app.b2.access-key-id:}")
    private String accessKeyId;

    @Value("${app.b2.secret-access-key:}")
    private String secretAccessKey;

    @Value("${app.b2.endpoint:}")
    private String endpoint;

    @Value("${app.b2.region:}")
    private String region;

    private StaticCredentialsProvider credentialsProvider() {
        String key = (accessKeyId != null && !accessKeyId.isBlank()) ? accessKeyId : "dummy-access-key";
        String secret = (secretAccessKey != null && !secretAccessKey.isBlank()) ? secretAccessKey : "dummy-secret-key";
        return StaticCredentialsProvider.create(
                AwsBasicCredentials.create(key, secret));
    }

    private String getEffectiveEndpoint() {
        return (endpoint != null && !endpoint.isBlank()) ? endpoint : "s3.us-east-005.backblazeb2.com";
    }

    private Region getEffectiveRegion() {
        return (region != null && !region.isBlank()) ? Region.of(region) : Region.of("us-east-005");
    }

    @Bean
    public S3Client s3Client() {
        return S3Client.builder()
                .credentialsProvider(credentialsProvider())
                .endpointOverride(URI.create("https://" + getEffectiveEndpoint()))
                .region(getEffectiveRegion())
                .serviceConfiguration(S3Configuration.builder()
                        .pathStyleAccessEnabled(true) // Required for B2
                        .build())
                .build();
    }

    @Bean
    public S3Presigner s3Presigner() {
        return S3Presigner.builder()
                .credentialsProvider(credentialsProvider())
                .endpointOverride(URI.create("https://" + getEffectiveEndpoint()))
                .region(getEffectiveRegion())
                .serviceConfiguration(S3Configuration.builder()
                        .pathStyleAccessEnabled(true)
                        .build())
                .build();
    }
}
