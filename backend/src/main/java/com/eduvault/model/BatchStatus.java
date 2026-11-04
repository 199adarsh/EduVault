package com.eduvault.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BatchStatus {

    @JsonProperty("isRunning")
    private boolean isRunning;

    private String currentJobId;
    private String lastRun;
    private String lastCompleted;
    private int pendingNotes;
    private int completedNotes;
    private int failedNotes;
    private int totalNotes;

    @JsonProperty("isRunning")
    public boolean isRunning() {
        return isRunning;
    }

    @JsonProperty("isRunning")
    public void setRunning(boolean running) {
        this.isRunning = running;
    }
}
