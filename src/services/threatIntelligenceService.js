const axios = require('axios');
const AuditLogService = require('./auditLogService');

class ThreatIntelligenceService {
  // External threat intelligence providers
  static PROVIDERS = {
    VIRUSTOTAL: {
      apiKey: process.env.VIRUSTOTAL_API_KEY,
      baseUrl: 'https://www.virustotal.com/api/v3'
    },
    ABUSEIPDB: {
      apiKey: process.env.ABUSEIPDB_API_KEY,
      baseUrl: 'https://api.abuseipdb.com/api/v2'
    },
    HYBRIDANALYSIS: {
      apiKey: process.env.HYBRIDANALYSIS_API_KEY,
      baseUrl: 'https://www.hybrid-analysis.com/api/v2'
    }
  };

  // IP reputation check
  static async checkIPReputation(ipAddress) {
    try {
      const [abuseIPDBResponse, virusTotalResponse] = await Promise.all([
        this.checkAbuseIPDB(ipAddress),
        this.checkVirusTotalIP(ipAddress)
      ]);

      const combinedReport = {
        ipAddress,
        abuseIPDB: abuseIPDBResponse,
        virusTotal: virusTotalResponse,
        riskScore: this.calculateIPRiskScore(
          abuseIPDBResponse, 
          virusTotalResponse
        )
      };

      // Log IP reputation check
      await AuditLogService.log({
        action: 'IP_REPUTATION_CHECK',
        details: combinedReport
      });

      return combinedReport;
    } catch (error) {
      console.error('IP reputation check error:', error);
      throw error;
    }
  }

  // AbuseIPDB reputation check
  static async checkAbuseIPDB(ipAddress) {
    try {
      const response = await axios.get(`${this.PROVIDERS.ABUSEIPDB.baseUrl}/check`, {
        params: {
          ipAddress,
          maxAgeInDays: 90
        },
        headers: {
          'Key': this.PROVIDERS.ABUSEIPDB.apiKey,
          'Accept': 'application/json'
        }
      });

      return {
        isPublic: response.data.data.isPublic,
        abuseConfidenceScore: response.data.data.abuseConfidenceScore,
        totalReports: response.data.data.totalReports,
        lastReportedAt: response.data.data.lastReportedAt
      };
    } catch (error) {
      console.error('AbuseIPDB check error:', error);
      return null;
    }
  }

  // VirusTotal IP check
  static async checkVirusTotalIP(ipAddress) {
    try {
      const response = await axios.get(
        `${this.PROVIDERS.VIRUSTOTAL.baseUrl}/ip_addresses/${ipAddress}`,
        {
          headers: {
            'x-apikey': this.PROVIDERS.VIRUSTOTAL.apiKey
          }
        }
      );

      return {
        detectedUrls: response.data.data.attributes.total_detected_urls,
        detectedDownloads: response.data.data.attributes.total_detected_downloaded_samples,
        communityScore: response.data.data.attributes.reputation
      };
    } catch (error) {
      console.error('VirusTotal IP check error:', error);
      return null;
    }
  }

  // File/Malware scanning
  static async scanFile(fileBuffer, fileName) {
    try {
      const formData = new FormData();
      formData.append('file', fileBuffer, fileName);

      const [virusTotalResponse, hybridAnalysisResponse] = await Promise.all([
        axios.post(`${this.PROVIDERS.VIRUSTOTAL.baseUrl}/files`, formData, {
          headers: {
            'x-apikey': this.PROVIDERS.VIRUSTOTAL.apiKey,
            'Content-Type': 'multipart/form-data'
          }
        }),
        axios.post(`${this.PROVIDERS.HYBRIDANALYSIS.baseUrl}/submit/file`, formData, {
          headers: {
            'api-key': this.PROVIDERS.HYBRIDANALYSIS.apiKey,
            'Content-Type': 'multipart/form-data'
          }
        })
      ]);

      const combinedReport = {
        fileName,
        virusTotal: {
          analysisId: virusTotalResponse.data.id,
          status: virusTotalResponse.data.status
        },
        hybridAnalysis: {
          jobId: hybridAnalysisResponse.data.job_id,
          status: hybridAnalysisResponse.data.status
        },
        riskScore: this.calculateFileRiskScore(
          virusTotalResponse.data, 
          hybridAnalysisResponse.data
        )
      };

      // Log file scanning
      await AuditLogService.log({
        action: 'FILE_SCANNING',
        details: combinedReport
      });

      return combinedReport;
    } catch (error) {
      console.error('File scanning error:', error);
      throw error;
    }
  }

  // Calculate IP risk score
  static calculateIPRiskScore(abuseIPDB, virusTotal) {
    let riskScore = 0;

    if (abuseIPDB) {
      riskScore += abuseIPDB.abuseConfidenceScore / 10;
      riskScore += abuseIPDB.totalReports > 10 ? 2 : 0;
    }

    if (virusTotal) {
      riskScore += virusTotal.detectedUrls > 5 ? 3 : 0;
      riskScore += virusTotal.detectedDownloads > 3 ? 2 : 0;
      riskScore += virusTotal.communityScore < -10 ? 2 : 0;
    }

    return Math.min(Math.max(riskScore, 0), 10);
  }

  // Calculate file risk score
  static calculateFileRiskScore(virusTotalResult, hybridAnalysisResult) {
    let riskScore = 0;

    // VirusTotal detection ratio
    if (virusTotalResult.attributes) {
      const detectionRatio = 
        virusTotalResult.attributes.total_detected / 
        virusTotalResult.attributes.total_scans;
      
      riskScore += detectionRatio > 0.3 ? 5 : 0;
    }

    // Hybrid Analysis malware classification
    if (hybridAnalysisResult.verdict) {
      riskScore += hybridAnalysisResult.verdict === 'malicious' ? 5 : 0;
    }

    return Math.min(Math.max(riskScore, 0), 10);
  }

  // Continuous threat monitoring
  static async runThreatMonitoring() {
    try {
      // Implement periodic threat intelligence gathering
      const [
        globalThreatFeeds,
        emergingThreats
      ] = await Promise.all([
        this.fetchGlobalThreatFeeds(),
        this.fetchEmergingThreats()
      ]);

      const consolidatedThreats = this.consolidateThreatIntelligence(
        globalThreatFeeds, 
        emergingThreats
      );

      // Log threat intelligence
      await AuditLogService.log({
        action: 'THREAT_INTELLIGENCE_MONITORING',
        details: consolidatedThreats
      });

      return consolidatedThreats;
    } catch (error) {
      console.error('Threat monitoring error:', error);
      return [];
    }
  }

  // Fetch global threat feeds
  static async fetchGlobalThreatFeeds() {
    // Implement integration with global threat intelligence providers
    // This is a placeholder for actual threat feed integration
    return [];
  }

  // Fetch emerging threats
  static async fetchEmergingThreats() {
    // Implement integration with emerging threat intelligence sources
    // This is a placeholder for actual emerging threat detection
    return [];
  }

  // Consolidate threat intelligence
  static consolidateThreatIntelligence(globalFeeds, emergingThreats) {
    // Combine and deduplicate threat intelligence
    const consolidatedThreats = [
      ...globalFeeds,
      ...emergingThreats
    ];

    // Remove duplicates and rank by severity
    return consolidatedThreats
      .filter((threat, index, self) => 
        index === self.findIndex(t => t.id === threat.id)
      )
      .sort((a, b) => b.severity - a.severity);
  }
}

module.exports = ThreatIntelligenceService;
