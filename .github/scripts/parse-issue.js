/**
 * Parse issue data and metadata
 */

// Check if metadata already exists (prefer metadata over form data)
function parseMetadata(body) {
  const metadataMatch = body.match(/<!-- ROADMAP_SYNC: (.*?) -->/);
  if (metadataMatch) {
    try {
      return JSON.parse(metadataMatch[1]);
    } catch (e) {
      console.log('Failed to parse metadata:', e);
      return null;
    }
  }
  return null;
}

// Parse issue form data (fallback for first time)
function parseFormData(body) {
  const data = {};
  
  // Extract Status
  const statusMatch = body.match(/### Status\s*\n\s*(.+)/);
  if (statusMatch) data.status = statusMatch[1].trim();
  
  // Extract Release Phase  
  const releasePhaseMatch = body.match(/### Release Phase\s*\n\s*(.+)/);
  if (releasePhaseMatch) data.release_phase = releasePhaseMatch[1].trim();
  
  // Extract Area
  const areaMatch = body.match(/### Area\s*\n\s*(.+)/);
  if (areaMatch) data.area = areaMatch[1].trim();
  
  return data;
}

// Extract content we want to keep for clean body
function extractContent(body) {
  const extractDescription = (body) => {
    const descMatch = body.match(/### Description\s*\n([\s\S]*?)(?=###|$)/);
    return descMatch ? descMatch[1].trim() : '';
  };
  
  const extractPurpose = (body) => {
    const purposeMatch = body.match(/### Purpose\s*\n([\s\S]*?)(?=###|$)/);
    return purposeMatch ? purposeMatch[1].trim() : '';
  };
  
  const extractRepoLink = (body) => {
    const repoMatch = body.match(/### Repository Link\s*\n([^\n]*)/);
    return repoMatch ? repoMatch[1].trim() : '';
  };
  
  const extractDevTeam = (body) => {
    const devTeamMatch = body.match(/### Development Team\s*\n([\s\S]*?)(?=###|$)/);
    return devTeamMatch ? devTeamMatch[1].trim() : '';
  };

  return {
    description: extractDescription(body),
    purpose: extractPurpose(body),
    repoLink: extractRepoLink(body),
    devTeam: extractDevTeam(body)
  };
}

// Build clean issue body
function buildCleanBody(content, metadata) {
  let cleanBody = '';
  
  if (content.description) {
    cleanBody += `## Description\n${content.description}\n\n`;
  }
  
  if (content.purpose) {
    cleanBody += `## Purpose\n${content.purpose}\n\n`;
  }
  
  if (content.repoLink) {
    cleanBody += `**Repository:** ${content.repoLink}\n\n`;
  }
  
  if (content.devTeam) {
    cleanBody += `**Development Team:**\n${content.devTeam}\n\n`;
  }
  
  cleanBody += `<!-- ROADMAP_SYNC: ${JSON.stringify(metadata)} -->`;
  
  return cleanBody;
}

module.exports = {
  parseMetadata,
  parseFormData,
  extractContent,
  buildCleanBody
};