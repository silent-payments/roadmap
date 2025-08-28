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
  const statusMatch = body.match(/## Status\s*\n\s*(.+)/);
  if (statusMatch) data.status = statusMatch[1].trim();
  
  // Extract Release Phase
  const releasePhaseMatch = body.match(/## Release Phase\s*\n\s*(.+)/);
  if (releasePhaseMatch) data.release_phase = releasePhaseMatch[1].trim();
  
  // Extract Area
  const areaMatch = body.match(/## Area\s*\n\s*(.+)/);
  if (areaMatch) data.area = areaMatch[1].trim();
  
  return data;
}

// Extract content we want to keep for clean body
function extractContent(body) {
  console.log('Extracting content from body:', body.substring(0, 200) + '...');
  
  const extractDescription = (body) => {
    const descMatch = body.match(/## Description\s*\n([\s\S]*?)(?=##|$)/);
    const result = descMatch ? descMatch[1].trim() : '';
    console.log('Extracted description:', result.substring(0, 100) + (result.length > 100 ? '...' : ''));
    return result;
  };
  
  const extractPurpose = (body) => {
    const purposeMatch = body.match(/## Purpose\s*\n([\s\S]*?)(?=##|$)/);
    const result = purposeMatch ? purposeMatch[1].trim() : '';
    console.log('Extracted purpose:', result.substring(0, 100) + (result.length > 100 ? '...' : ''));
    return result;
  };
  
  const extractRepoLink = (body) => {
    // Try form field and cleaned format
    let repoMatch = body.match(/## Repository Link\s*\n([^\n]*)/);
    if (!repoMatch) repoMatch = body.match(/\*\*Repository:\*\*\s*(.+)/);
    
    const link = repoMatch ? repoMatch[1].trim() : '';
    console.log('Extracted repo link:', link);
    
    // Extract PR number from GitHub PR URLs
    const prMatch = link.match(/github\.com\/[^\/]+\/[^\/]+\/pull\/(\d+)/);
    return {
      url: link,
      prNumber: prMatch ? parseInt(prMatch[1]) : null
    };
  };
  
  const extractDevTeam = (body) => {
    // Try form field and cleaned format
    let devTeamMatch = body.match(/## Development Team\s*\n([\s\S]*?)(?=##|$)/);
    if (!devTeamMatch) devTeamMatch = body.match(/\*\*Development Team:\*\*\s*\n([\s\S]*?)(?=\*\*|$|<!--)/);
    
    const result = devTeamMatch ? devTeamMatch[1].trim() : '';
    console.log('Extracted dev team:', result.substring(0, 100) + (result.length > 100 ? '...' : ''));
    return result;
  };

  const content = {
    description: extractDescription(body),
    purpose: extractPurpose(body),
    repoLink: extractRepoLink(body),
    devTeam: extractDevTeam(body)
  };
  
  console.log('Final extracted content:', {
    hasDescription: !!content.description,
    hasPurpose: !!content.purpose,
    hasRepoLink: !!content.repoLink.url,
    hasDevTeam: !!content.devTeam
  });
  
  return content;
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
    const repoUrl = typeof content.repoLink === 'object' ? content.repoLink.url : content.repoLink;
    if (repoUrl) {
      cleanBody += `**Repository:** ${repoUrl}\n\n`;
    }
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