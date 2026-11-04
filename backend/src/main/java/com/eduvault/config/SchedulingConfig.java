package com.eduvault.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Lazy;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.SchedulingConfigurer;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;
import org.springframework.scheduling.config.ScheduledTaskRegistrar;

@Configuration
@EnableScheduling
@Lazy(false)
public class SchedulingConfig implements SchedulingConfigurer {

    private static final Logger logger = LoggerFactory.getLogger(SchedulingConfig.class);

    @Value("${app.scheduling.pool-size:2}")
    private int poolSize;

    @Value("${app.scheduling.thread-name-prefix:eduvault-scheduler-}")
    private String threadNamePrefix;

    @Bean(name = "taskScheduler")
    @Lazy(false)
    public ThreadPoolTaskScheduler taskScheduler() {
        ThreadPoolTaskScheduler scheduler = new ThreadPoolTaskScheduler();
        scheduler.setPoolSize(poolSize);
        scheduler.setThreadNamePrefix(threadNamePrefix);
        scheduler.setWaitForTasksToCompleteOnShutdown(true);
        scheduler.setAwaitTerminationSeconds(60);
        scheduler.setRemoveOnCancelPolicy(true);
        scheduler.setErrorHandler(throwable ->
            logger.error("Uncaught exception in scheduled background task: {}", throwable.getMessage(), throwable)
        );
        scheduler.initialize();
        logger.info("SchedulingConfig initialized with poolSize={}, threadPrefix={}", poolSize, threadNamePrefix);
        return scheduler;
    }

    @Override
    public void configureTasks(ScheduledTaskRegistrar taskRegistrar) {
        taskRegistrar.setTaskScheduler(taskScheduler());
    }
}
