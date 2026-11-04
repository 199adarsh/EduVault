package com.eduvault.model;

public class BatchTriggerResult {
    private String status; // "STARTED", "ALREADY_RUNNING", "QUEUED"
    private String jobId;
    private String message;
    private Integer processedCount;

    public BatchTriggerResult() {}

    public BatchTriggerResult(String status, String jobId, String message, Integer processedCount) {
        this.status = status;
        this.jobId = jobId;
        this.message = message;
        this.processedCount = processedCount;
    }

    public static BatchTriggerResultBuilder builder() {
        return new BatchTriggerResultBuilder();
    }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getJobId() { return jobId; }
    public void setJobId(String jobId) { this.jobId = jobId; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public Integer getProcessedCount() { return processedCount; }
    public void setProcessedCount(Integer processedCount) { this.processedCount = processedCount; }

    public static class BatchTriggerResultBuilder {
        private String status;
        private String jobId;
        private String message;
        private Integer processedCount;

        BatchTriggerResultBuilder() {}

        public BatchTriggerResultBuilder status(String status) {
            this.status = status;
            return this;
        }

        public BatchTriggerResultBuilder jobId(String jobId) {
            this.jobId = jobId;
            return this;
        }

        public BatchTriggerResultBuilder message(String message) {
            this.message = message;
            return this;
        }

        public BatchTriggerResultBuilder processedCount(Integer processedCount) {
            this.processedCount = processedCount;
            return this;
        }

        public BatchTriggerResult build() {
            return new BatchTriggerResult(status, jobId, message, processedCount);
        }
    }
}
