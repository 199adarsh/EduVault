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
        return StaticCredentialsProvider.create(
                AwsBasicCredentials.create(accessKeyId, secretAccessKey));
    }

    @Bean
    public S3Client s3Client() {
        return S3Client.builder()
                .credentialsProvider(credentialsProvider())
                .endpointOverride(URI.create("https://" + endpoint))
                .region(Region.of(region))
                .serviceConfiguration(S3Configuration.builder()
                        .pathStyleAccessEnabled(true) // Required for B2
                        .build())
                .build();
    }

    @Bean
    public S3Presigner s3Presigner() {
        return S3Presigner.builder()
                .credentialsProvider(credentialsProvider())
                .endpointOverride(URI.create("https://" + endpoint))
                .region(Region.of(region))
                .serviceConfiguration(S3Configuration.builder()
                        .pathStyleAccessEnabled(true)
                        .build())
                .build();
    }
}
