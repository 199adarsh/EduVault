package com.eduvault.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.Executor;

@Configuration
@EnableAsync
public class AsyncConfig {

    private static final Logger logger = LoggerFactory.getLogger(AsyncConfig.class);

    @Bean(name = "geminiTaskExecutor")
    public Executor geminiTaskExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        
        // Limit concurrent Gemini API calls to prevent proxy/concurrency exhaustion
        executor.setCorePoolSize(2);           // 2 threads minimum
        executor.setMaxPoolSize(4);            // 4 threads maximum
        executor.setQueueCapacity(50);        // Queue up to 50 tasks
        executor.setThreadNamePrefix("gemini-async-");
        executor.setRejectedExecutionHandler((r, executor1) -> {
            logger.warn("Gemini task rejected due to thread pool exhaustion. Consider reducing concurrent AI processing.");
        });
        
        executor.initialize();
        logger.info("Gemini async executor initialized with core={}, max={}, queue={}", 
                   executor.getCorePoolSize(), executor.getMaxPoolSize(), executor.getQueueCapacity());
        
        return executor;
    }

    @Bean(name = "ragTaskExecutor") 
    public Executor ragTaskExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        
        // Separate executor for RAG embedding tasks - conservative limits
        executor.setCorePoolSize(1);           // 1 thread for embeddings
        executor.setMaxPoolSize(2);            // 2 threads maximum
        executor.setQueueCapacity(20);        // Queue up to 20 embedding tasks
        executor.setThreadNamePrefix("rag-async-");
        executor.setRejectedExecutionHandler((r, executor1) -> {
            logger.warn("RAG embedding task rejected due to thread pool exhaustion.");
        });
        
        executor.initialize();
        logger.info("RAG async executor initialized with core={}, max={}, queue={}", 
                   executor.getCorePoolSize(), executor.getMaxPoolSize(), executor.getQueueCapacity());
        
        return executor;
    }
}
