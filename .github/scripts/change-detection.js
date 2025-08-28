/**
 * Detect if issue changes warrant workflow execution
 */

// Check if sender is a bot
function isBotSender(sender) {
  return (
    sender.login === 'github-actions[bot]' || 
    sender.type === 'Bot' ||
    sender.login.includes('bot') ||
    sender.id === 41898282 // github-actions[bot] ID
  );
}

// Extract meaningful fields from issue body
function extractMeaningfulFields(body) {
  const status = body.match(/## Status\s*\n\s*(.+)/);
  const area = body.match(/## Area\s*\n\s*(.+)/);
  const releasePhase = body.match(/## Release Phase\s*\n\s*(.+)/);
  
  return {
    status: status ? status[1].trim() : null,
    area: area ? area[1].trim() : null,
    releasePhase: releasePhase ? releasePhase[1].trim() : null
  };
}

// Remove metadata from body for comparison
function cleanBody(body) {
  return body.replace(/<!-- ROADMAP_SYNC: .*? -->/g, '').trim();
}

// Check if meaningful fields changed between old and new body
function didMeaningfulFieldsChange(oldBody, currentBody) {
  const oldFields = extractMeaningfulFields(oldBody);
  const currentFields = extractMeaningfulFields(currentBody);
  
  const fieldsChanged = (
    oldFields.status !== currentFields.status ||
    oldFields.area !== currentFields.area ||
    oldFields.releasePhase !== currentFields.releasePhase
  );
  
  return {
    changed: fieldsChanged,
    oldFields,
    currentFields
  };
}

// Main function to determine if workflow should run
function shouldRunWorkflow(context) {
  console.log('Event:', context.eventName);
  console.log('Action:', context.payload.action);
  
  if (context.payload.sender) {
    console.log('Sender:', {
      login: context.payload.sender.login,
      type: context.payload.sender.type,
      id: context.payload.sender.id
    });
  }
  
  // Always run for new issues
  if (context.eventName === 'issues' && context.payload.action === 'opened') {
    console.log('✅ Running workflow - new issue created');
    return { shouldRun: true, reason: 'new issue created' };
  }
  
  // Always run for manual triggers
  if (context.eventName === 'workflow_dispatch') {
    console.log('✅ Running workflow - manual trigger');
    return { shouldRun: true, reason: 'manual trigger' };
  }
  
  // Handle issue edits
  if (context.eventName === 'issues' && context.payload.action === 'edited') {
    const sender = context.payload.sender;
    const currentBody = context.payload.issue.body || '';
    const changes = context.payload.changes;
    
    // Check if sender is a bot
    if (isBotSender(sender)) {
      console.log('🛑 Skipping - issue was edited by bot/workflow');
      return { shouldRun: false, reason: 'bot edit' };
    }
    
    // Analyze body changes if available
    if (changes && changes.body) {
      const oldBody = changes.body.from || '';
      console.log('Analyzing body changes...');
      
      // Remove metadata from both versions for comparison
      const cleanOldBody = cleanBody(oldBody);
      const cleanCurrentBody = cleanBody(currentBody);
      
      // If only metadata changed, this was likely a workflow edit
      if (cleanOldBody === cleanCurrentBody) {
        console.log('🛑 Skipping - only metadata changed (workflow edit)');
        return { shouldRun: false, reason: 'only metadata changed' };
      }
      
      // Check if meaningful fields changed
      const fieldChanges = didMeaningfulFieldsChange(oldBody, currentBody);
      
      console.log('Field comparison:', {
        old: fieldChanges.oldFields,
        current: fieldChanges.currentFields,
        changed: fieldChanges.changed
      });
      
      if (!fieldChanges.changed) {
        console.log('🛑 Skipping - no meaningful field changes detected');
        return { 
          shouldRun: false, 
          reason: 'no meaningful field changes',
          fieldComparison: fieldChanges
        };
      }
      
      console.log('✅ Meaningful changes detected, proceeding with sync');
      return { 
        shouldRun: true, 
        reason: 'meaningful field changes detected',
        fieldComparison: fieldChanges
      };
    }
    
    // If we can't analyze changes, be conservative and run
    console.log('⚠️  Cannot analyze changes, running workflow to be safe');
    return { shouldRun: true, reason: 'unable to analyze changes' };
  }
  
  // Unknown event, don't run
  console.log('🛑 Skipping - unknown event type');
  return { shouldRun: false, reason: 'unknown event type' };
}

module.exports = {
  shouldRunWorkflow,
  extractMeaningfulFields,
  cleanBody,
  didMeaningfulFieldsChange,
  isBotSender
};