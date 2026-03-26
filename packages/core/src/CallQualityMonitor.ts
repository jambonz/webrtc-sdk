/**
 * CallQualityMonitor — polls RTCPeerConnection.getStats() during an active
 * call and computes audio quality metrics (jitter, packet loss, latency).
 */

export interface CallQualityStats {
  /** Round-trip time in milliseconds */
  roundTripTime: number;
  /** Jitter in milliseconds */
  jitter: number;
  /** Fraction of packets lost (0.0 – 1.0) */
  packetLoss: number;
  /** Total packets sent */
  packetsSent: number;
  /** Total packets received */
  packetsReceived: number;
  /** Total packets lost */
  packetsLost: number;
  /** Audio codec in use (e.g. 'opus', 'PCMU') */
  codec: string;
  /** Timestamp of this measurement */
  timestamp: number;
}

export class CallQualityMonitor {
  private timer: ReturnType<typeof setInterval> | null = null;
  private listener: ((stats: CallQualityStats) => void) | null = null;

  /**
   * Start polling quality stats.
   * @param connection - The RTCPeerConnection to monitor
   * @param intervalMs - Polling interval in ms (default: 2000)
   */
  start(connection: RTCPeerConnection, intervalMs = 2000): void {
    this.stop();
    this.timer = setInterval(() => this.collect(connection), intervalMs);
  }

  /** Stop polling. */
  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /** Set the callback for quality stats updates. */
  onStats(listener: (stats: CallQualityStats) => void): void {
    this.listener = listener;
  }

  /** Collect stats once. */
  async collect(connection: RTCPeerConnection): Promise<CallQualityStats | null> {
    try {
      const report = await connection.getStats();
      const stats = this.parseStats(report);
      if (stats && this.listener) {
        this.listener(stats);
      }
      return stats;
    } catch {
      return null;
    }
  }

  private parseStats(report: RTCStatsReport): CallQualityStats | null {
    let roundTripTime = 0;
    let jitter = 0;
    let packetLoss = 0;
    let packetsSent = 0;
    let packetsReceived = 0;
    let packetsLost = 0;
    let codec = '';

    const codecs = new Map<string, string>();

    report.forEach((stat) => {
      if (stat.type === 'codec') {
        codecs.set(stat.id, stat.mimeType?.split('/')[1] ?? '');
      }

      // Inbound audio stats (what we receive)
      if (stat.type === 'inbound-rtp' && stat.kind === 'audio') {
        jitter = (stat.jitter ?? 0) * 1000; // convert to ms
        packetsReceived = stat.packetsReceived ?? 0;
        packetsLost = stat.packetsLost ?? 0;
        if (packetsReceived + packetsLost > 0) {
          packetLoss = packetsLost / (packetsReceived + packetsLost);
        }
        if (stat.codecId) {
          codec = codecs.get(stat.codecId) ?? '';
        }
      }

      // Outbound audio stats (what we send)
      if (stat.type === 'outbound-rtp' && stat.kind === 'audio') {
        packetsSent = stat.packetsSent ?? 0;
        if (!codec && stat.codecId) {
          codec = codecs.get(stat.codecId) ?? '';
        }
      }

      // Candidate pair stats (for RTT)
      if (stat.type === 'candidate-pair' && stat.state === 'succeeded') {
        roundTripTime = (stat.currentRoundTripTime ?? 0) * 1000; // convert to ms
      }
    });

    // Only return if we got meaningful data
    if (packetsReceived === 0 && packetsSent === 0) return null;

    return {
      roundTripTime,
      jitter,
      packetLoss,
      packetsSent,
      packetsReceived,
      packetsLost,
      codec,
      timestamp: Date.now(),
    };
  }
}
