import {
  PRAnalysis,
  PRFeedback,
  QualityAssessment,
  SecurityAssessment,
  SecurityVulnerability,
  FocusArea,
} from '../types/api.js';
import { logger } from '../utils/logger.js';

export class FeedbackService {
  generatePRFeedback(
    prAnalysis: PRAnalysis,
    focusAreas?: FocusArea[]
  ): PRFeedback {
    logger.info('Generating PR feedback', {
      pr: `${prAnalysis.title}`,
      focusAreas,
      filesChanged: prAnalysis.files_changed.length,
      commits: prAnalysis.commits.length,
    });

    const codeQuality = this.assessCodeQuality(prAnalysis);
    const securityAssessment = this.analyzeSecurityConsiderations(prAnalysis);
    const suggestions = this.generateSuggestions(prAnalysis, focusAreas);
    const bestPractices = this.checkBestPractices(prAnalysis);
    const complexityAnalysis = this.analyzeComplexity(prAnalysis);

    const overallAssessment = this.generateOverallAssessment(
      prAnalysis,
      codeQuality,
      securityAssessment
    );

    const summaryScore = this.calculateSummaryScore(
      codeQuality,
      securityAssessment,
      bestPractices
    );

    const focusAreaAnalysis = focusAreas
      ? this.generateFocusAreaAnalysis(prAnalysis, focusAreas)
      : undefined;

    return {
      overall_assessment: overallAssessment,
      summary_score: summaryScore,
      code_quality: codeQuality,
      security_assessment: securityAssessment,
      suggestions,
      best_practices: bestPractices,
      focus_area_analysis: focusAreaAnalysis,
      estimated_review_time: this.estimateReviewTime(prAnalysis),
      complexity_analysis: complexityAnalysis,
    };
  }

  private assessCodeQuality(prAnalysis: PRAnalysis): QualityAssessment {
    let score = 10;
    const comments: string[] = [];
    const strengths: string[] = [];
    const concerns: string[] = [];

    const { diff_summary, files_changed, commits, description } = prAnalysis;

    // Size-based assessments
    if (diff_summary.total_changes > 500) {
      score -= 2;
      concerns.push('Large PR with many changes - consider breaking into smaller PRs');
    } else if (diff_summary.total_changes < 50) {
      strengths.push('Focused PR with manageable scope');
    }

    if (files_changed.length > 20) {
      score -= 1;
      concerns.push('Many files changed - ensure changes are related and cohesive');
    } else if (files_changed.length <= 5) {
      strengths.push('Limited number of files changed, easier to review');
    }

    // Test coverage assessment
    const hasTests = files_changed.some(file => 
      this.isTestFile(file.filename)
    );

    if (!hasTests && diff_summary.total_changes > 50) {
      score -= 2;
      concerns.push('No test files detected - consider adding tests for new functionality');
    } else if (hasTests) {
      strengths.push('Includes test files');
    }

    // Documentation assessment
    const hasDocumentation = files_changed.some(file => 
      file.filename.endsWith('.md') || 
      file.filename.includes('README') ||
      file.filename.includes('docs/')
    );

    if (!hasDocumentation && diff_summary.total_changes > 100) {
      score -= 1;
      concerns.push('Consider updating documentation for significant changes');
    } else if (hasDocumentation) {
      strengths.push('Includes documentation updates');
    }

    // PR description quality
    if (description.length < 50) {
      score -= 1;
      concerns.push('PR description is brief - consider adding more context');
    } else if (description.length > 200) {
      strengths.push('Comprehensive PR description provided');
    }

    // Commit quality
    const commitCount = commits.length;
    if (commitCount > 20) {
      score -= 1;
      concerns.push('Many commits - consider squashing related commits');
    } else if (commitCount <= 5) {
      strengths.push('Reasonable number of commits');
    }

    // File size distribution
    const largeFiles = files_changed.filter(f => f.size_category === 'xl').length;
    if (largeFiles > 0) {
      score -= 1;
      concerns.push(`${largeFiles} files with extensive changes - review carefully`);
    }

    const finalScore = Math.max(0, Math.min(10, score));
    const grade = this.scoreToGrade(finalScore);

    comments.push(...strengths.map(s => `✅ ${s}`));
    comments.push(...concerns);

    return {
      score: finalScore,
      grade,
      comments,
      strengths,
      concerns,
    };
  }

  private analyzeSecurityConsiderations(prAnalysis: PRAnalysis): SecurityAssessment {
    const considerations: string[] = [];
    const vulnerabilities: SecurityVulnerability[] = [];
    const recommendations: string[] = [];

    // Check for security-sensitive files
    const securitySensitiveFiles = prAnalysis.files_changed.filter(file => 
      this.isSecuritySensitiveFile(file.filename)
    );

    if (securitySensitiveFiles.length > 0) {
      considerations.push(
        `Security-sensitive files modified: ${securitySensitiveFiles.map(f => f.filename).join(', ')}`
      );
      recommendations.push('Ensure thorough security review and testing');
    }

    // Check for configuration changes
    const configFiles = prAnalysis.files_changed.filter(file =>
      this.isConfigurationFile(file.filename)
    );

    if (configFiles.length > 0) {
      considerations.push('Configuration files modified - verify no sensitive data is exposed');
      recommendations.push('Review configuration changes for security implications');
    }

    // Check for dependency changes
    const dependencyFiles = prAnalysis.files_changed.filter(file =>
      this.isDependencyFile(file.filename)
    );

    if (dependencyFiles.length > 0) {
      considerations.push('Dependencies modified - ensure packages are from trusted sources');
      recommendations.push('Run security audit on new dependencies');
    }

    // Analyze commit messages for potential secrets
    const suspiciousCommits = prAnalysis.commits.filter(commit =>
      this.hasSuspiciousContent(commit.message)
    );

    if (suspiciousCommits.length > 0) {
      vulnerabilities.push({
        type: 'Potential secret in commit message',
        severity: 'medium',
        description: 'Commit messages may contain sensitive information',
        file: 'commit-messages',
        recommendation: 'Review commit messages for exposed secrets',
      });
    }

    const riskLevel = this.calculateSecurityRiskLevel(
      considerations.length,
      vulnerabilities.length
    );

    return {
      risk_level: riskLevel,
      considerations,
      vulnerabilities_found: vulnerabilities,
      recommendations,
    };
  }

  private generateSuggestions(
    prAnalysis: PRAnalysis,
    focusAreas?: FocusArea[]
  ): string[] {
    const suggestions: string[] = [];

    // Focus area specific suggestions
    focusAreas?.forEach(area => {
      switch (area) {
        case 'performance':
          suggestions.push(
            'Consider adding performance benchmarks for critical code paths',
            'Review for potential memory leaks or inefficient algorithms'
          );
          break;
        case 'accessibility':
          if (this.hasUIChanges(prAnalysis)) {
            suggestions.push(
              'Verify accessibility compliance (ARIA labels, keyboard navigation)',
              'Test with screen readers and accessibility tools'
            );
          }
          break;
        case 'documentation':
          suggestions.push(
            'Update API documentation if public interfaces changed',
            'Consider adding inline code comments for complex logic'
          );
          break;
        case 'testing':
          suggestions.push(
            'Add unit tests for new functionality',
            'Consider integration tests for complex workflows'
          );
          break;
      }
    });

    // General suggestions based on PR characteristics
    if (this.hasNewFeatures(prAnalysis)) {
      suggestions.push(
        'Consider adding feature flags for gradual rollout',
        'Ensure error handling covers edge cases for new functionality'
      );
    }

    if (this.hasBreakingChanges(prAnalysis)) {
      suggestions.push(
        'Update migration guide for breaking changes',
        'Consider deprecation warnings before removing functionality'
      );
    }

    if (prAnalysis.diff_summary.change_complexity === 'very_high') {
      suggestions.push(
        'Consider breaking this PR into smaller, focused changes',
        'Add comprehensive testing for complex changes'
      );
    }

    return [...new Set(suggestions)]; // Remove duplicates
  }

  private checkBestPractices(prAnalysis: PRAnalysis): {
    followed: string[];
    needs_improvement: string[];
  } {
    const followed: string[] = [];
    const needsImprovement: string[] = [];

    // Check conventional commits
    const hasConventionalCommits = prAnalysis.commits.every(commit =>
      this.isConventionalCommit(commit.message)
    );

    if (hasConventionalCommits) {
      followed.push('Follows conventional commit format');
    } else {
      needsImprovement.push('Consider using conventional commit format');
    }

    // Check PR title
    if (prAnalysis.title.length > 10 && this.isDescriptiveTitle(prAnalysis.title)) {
      followed.push('PR has descriptive title');
    } else {
      needsImprovement.push('Consider making PR title more descriptive');
    }

    // Check file count
    if (prAnalysis.files_changed.length <= 15) {
      followed.push('Reasonable number of files changed');
    }

    // Check for linked issues
    if (prAnalysis.metadata.linked_issues.length > 0) {
      followed.push('Links to related issues');
    } else {
      needsImprovement.push('Consider linking to related issue or ticket');
    }

    // Check for draft status on large PRs
    if (prAnalysis.draft && prAnalysis.diff_summary.total_changes > 200) {
      followed.push('Uses draft status for work-in-progress');
    }

    return { followed, needs_improvement: needsImprovement };
  }

  private analyzeComplexity(prAnalysis: PRAnalysis) {
    const cognitiveComplexity = this.calculateCognitiveComplexity(prAnalysis);
    const changeRisk = this.assessChangeRisk(prAnalysis);
    const testingRequirements = this.generateTestingRequirements(prAnalysis);

    return {
      cognitive_complexity: cognitiveComplexity,
      change_risk: changeRisk,
      testing_requirements: testingRequirements,
    };
  }

  private generateFocusAreaAnalysis(
    prAnalysis: PRAnalysis,
    focusAreas: FocusArea[]
  ): Record<FocusArea, string[]> {
    const analysis: Partial<Record<FocusArea, string[]>> = {};

    focusAreas.forEach(area => {
      analysis[area] = this.analyzeFocusArea(prAnalysis, area);
    });

    return analysis as Record<FocusArea, string[]>;
  }

  // Helper methods
  private isTestFile(filename: string): boolean {
    return /\.(test|spec)\.(ts|js|tsx|jsx|py|java|rb|go|rs)$/.test(filename) ||
           filename.includes('/test/') ||
           filename.includes('/__tests__/') ||
           filename.includes('/tests/');
  }

  private isSecuritySensitiveFile(filename: string): boolean {
    const patterns = [
      /auth/i, /password/i, /token/i, /secret/i, /credential/i,
      /security/i, /permission/i, /privilege/i, /crypto/i, /encrypt/i
    ];
    return patterns.some(pattern => pattern.test(filename));
  }

  private isConfigurationFile(filename: string): boolean {
    return filename.includes('config') ||
           filename.endsWith('.env') ||
           filename.endsWith('.yml') ||
           filename.endsWith('.yaml') ||
           filename.endsWith('.properties');
  }

  private isDependencyFile(filename: string): boolean {
    const dependencyFiles = [
      'package.json', 'yarn.lock', 'package-lock.json',
      'requirements.txt', 'Pipfile', 'poetry.lock',
      'Cargo.toml', 'Cargo.lock', 'go.mod', 'go.sum'
    ];
    return dependencyFiles.includes(filename);
  }

  private hasSuspiciousContent(text: string): boolean {
    const patterns = [
      /password/i, /secret/i, /token/i, /api[_-]?key/i,
      /private[_-]?key/i, /credential/i
    ];
    return patterns.some(pattern => pattern.test(text));
  }

  private hasUIChanges(prAnalysis: PRAnalysis): boolean {
    return prAnalysis.files_changed.some(file =>
      /\.(tsx|jsx|vue|svelte|html|css|scss)$/.test(file.filename)
    );
  }

  private hasNewFeatures(prAnalysis: PRAnalysis): boolean {
    return prAnalysis.commits.some(commit =>
      /^(feat|feature)/i.test(commit.message) ||
      /add|new/i.test(commit.message)
    );
  }

  private hasBreakingChanges(prAnalysis: PRAnalysis): boolean {
    return prAnalysis.commits.some(commit =>
      commit.message.includes('BREAKING') ||
      commit.message.includes('!:')
    );
  }

  private isConventionalCommit(message: string): boolean {
    return /^(feat|fix|docs|style|refactor|test|chore|perf|ci|build|revert)(\(.+\))?: .+/.test(message);
  }

  private isDescriptiveTitle(title: string): boolean {
    const nonDescriptivePatterns = [
      /^(fix|update|change|modify)$/i,
      /^(wip|temp|test|debug)$/i,
    ];
    return !nonDescriptivePatterns.some(pattern => pattern.test(title.trim()));
  }

  private scoreToGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
    if (score >= 9) return 'A';
    if (score >= 7) return 'B';
    if (score >= 5) return 'C';
    if (score >= 3) return 'D';
    return 'F';
  }

  private calculateSecurityRiskLevel(
    considerationsCount: number,
    vulnerabilitiesCount: number
  ): 'low' | 'medium' | 'high' | 'critical' {
    if (vulnerabilitiesCount > 0) return 'high';
    if (considerationsCount >= 3) return 'medium';
    if (considerationsCount >= 1) return 'low';
    return 'low';
  }

  private calculateCognitiveComplexity(prAnalysis: PRAnalysis): 'low' | 'medium' | 'high' {
    const { total_changes, files_count } = prAnalysis.diff_summary;
    const complexityScore = total_changes + (files_count * 10);
    
    if (complexityScore > 500) return 'high';
    if (complexityScore > 200) return 'medium';
    return 'low';
  }

  private assessChangeRisk(prAnalysis: PRAnalysis): 'low' | 'medium' | 'high' {
    const riskFactors = [
      prAnalysis.diff_summary.total_changes > 300,
      prAnalysis.files_changed.length > 15,
      prAnalysis.files_changed.some(f => this.isSecuritySensitiveFile(f.filename)),
      prAnalysis.commits.some(c => this.hasBreakingChanges(prAnalysis)),
    ].filter(Boolean).length;

    if (riskFactors >= 3) return 'high';
    if (riskFactors >= 2) return 'medium';
    return 'low';
  }

  private generateTestingRequirements(prAnalysis: PRAnalysis): string[] {
    const requirements: string[] = [];

    if (this.hasNewFeatures(prAnalysis)) {
      requirements.push('Unit tests for new functionality');
    }

    if (this.hasUIChanges(prAnalysis)) {
      requirements.push('UI/Component testing');
    }

    if (prAnalysis.files_changed.some(f => this.isSecuritySensitiveFile(f.filename))) {
      requirements.push('Security testing');
    }

    if (prAnalysis.diff_summary.change_complexity === 'high' || 
        prAnalysis.diff_summary.change_complexity === 'very_high') {
      requirements.push('Integration testing');
    }

    return requirements;
  }

  private analyzeFocusArea(prAnalysis: PRAnalysis, focusArea: FocusArea): string[] {
    switch (focusArea) {
      case 'performance':
        return [
          'Review algorithmic complexity of changes',
          'Check for potential memory leaks',
          'Consider caching strategies if applicable',
        ];
      case 'security':
        return [
          'Validate input sanitization',
          'Check for SQL injection vulnerabilities',
          'Review authentication and authorization changes',
        ];
      case 'accessibility':
        return [
          'Ensure keyboard navigation works',
          'Verify ARIA labels are present',
          'Test with screen readers',
        ];
      case 'maintainability':
        return [
          'Check code complexity metrics',
          'Ensure proper error handling',
          'Review code organization and structure',
        ];
      case 'testing':
        return [
          'Add unit tests for new code',
          'Update integration tests if needed',
          'Consider edge case testing',
        ];
      default:
        return [];
    }
  }

  private generateOverallAssessment(
    prAnalysis: PRAnalysis,
    codeQuality: QualityAssessment,
    securityAssessment: SecurityAssessment
  ): string {
    const { files_changed, diff_summary } = prAnalysis;
    
    let assessment = '';

    if (codeQuality.score >= 8) {
      assessment += 'This PR demonstrates high code quality with ';
    } else if (codeQuality.score >= 6) {
      assessment += 'This PR shows good code quality with ';
    } else {
      assessment += 'This PR has room for improvement in code quality with ';
    }

    assessment += `${files_changed.length} files modified (${diff_summary.total_changes} total line changes). `;

    if (securityAssessment.considerations.length > 0) {
      assessment += `${securityAssessment.considerations.length} security consideration${securityAssessment.considerations.length > 1 ? 's' : ''} identified. `;
    }

    if (codeQuality.score >= 8 && securityAssessment.risk_level === 'low') {
      assessment += 'Ready for review and merge with minimal concerns.';
    } else if (codeQuality.score >= 6) {
      assessment += 'Requires minor improvements before merge.';
    } else {
      assessment += 'Requires significant improvements before merge.';
    }

    return assessment;
  }

  private calculateSummaryScore(
    codeQuality: QualityAssessment,
    securityAssessment: SecurityAssessment,
    bestPractices: { followed: string[]; needs_improvement: string[] }
  ): number {
    let score = codeQuality.score;

    // Adjust for security risk
    switch (securityAssessment.risk_level) {
      case 'critical': score -= 3; break;
      case 'high': score -= 2; break;
      case 'medium': score -= 1; break;
    }

    // Adjust for best practices
    const practicesRatio = bestPractices.followed.length / 
      (bestPractices.followed.length + bestPractices.needs_improvement.length);
    
    score += (practicesRatio - 0.5) * 2; // Add/subtract up to 1 point

    return Math.max(0, Math.min(10, Math.round(score * 10) / 10));
  }

  private estimateReviewTime(prAnalysis: PRAnalysis): number {
    const baseTime = 15; // 15 minutes base review time
    const fileTime = prAnalysis.files_changed.length * 3; // 3 minutes per file
    const changeTime = Math.min(prAnalysis.diff_summary.total_changes * 0.5, 60); // 0.5 min per change, max 60

    return Math.round(baseTime + fileTime + changeTime);
  }
}