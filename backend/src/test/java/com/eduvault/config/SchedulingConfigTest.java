package com.eduvault.config;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;
import org.springframework.scheduling.config.ScheduledTaskRegistrar;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.*;

class SchedulingConfigTest {

    @Test
    @DisplayName("Initializes ThreadPoolTaskScheduler with configured pool size and prefix")
    void testTaskSchedulerConfiguration() {
        SchedulingConfig config = new SchedulingConfig();
        ReflectionTestUtils.setField(config, "poolSize", 3);
        ReflectionTestUtils.setField(config, "threadNamePrefix", "test-sched-");

        ThreadPoolTaskScheduler scheduler = config.taskScheduler();
        assertNotNull(scheduler);
        assertEquals(3, scheduler.getScheduledThreadPoolExecutor().getCorePoolSize());
        assertEquals("test-sched-", scheduler.getThreadNamePrefix());

        ScheduledTaskRegistrar registrar = new ScheduledTaskRegistrar();
        config.configureTasks(registrar);
        assertNotNull(registrar.getScheduler());

        scheduler.shutdown();
    }
}
