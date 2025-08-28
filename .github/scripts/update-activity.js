/**
 * Update project activity dates for roadmap issues
 */

const PROJECT_ID = 'PVT_kwDOCFSeTs4BBcFj';
const LAST_ACTIVITY_FIELD_ID = 'PVTF_lADOCFSeTs4BBcFjzg0IzLM';

// Find project item for issue
async function findProjectItem(github, issueNumber, repoName) {
  const query = `
    query {
      organization(login: "silent-payments") {
        projectV2(number: 2) {
          items(first: 100) {
            nodes {
              id
              content {
                ... on Issue {
                  number
                  repository {
                    name
                  }
                }
              }
            }
          }
        }
      }
    }
  `;
  
  const result = await github.graphql(query);
  
  const projectItem = result.organization.projectV2.items.nodes.find(
    item => item.content?.number === issueNumber && 
            item.content?.repository?.name === repoName
  );
  
  return projectItem;
}

// Update project date field
async function updateProjectDateField(github, projectItemId, fieldId, dateValue) {
  const updateMutation = `
    mutation($project: ID!, $item: ID!, $field: ID!, $value: ProjectV2FieldValue!) {
      updateProjectV2ItemFieldValue(
        input: {
          projectId: $project
          itemId: $item 
          fieldId: $field
          value: $value
        }
      ) {
        projectV2Item {
          id
        }
      }
    }
  `;
  
  await github.graphql(updateMutation, {
    project: PROJECT_ID,
    item: projectItemId,
    field: fieldId,
    value: { date: dateValue }
  });
}

// Main function to update activity for all issues
async function updateAllActivityDates(github, context) {
  const fetchActivity = require('./fetch-activity.js');
  
  console.log('Starting activity update for all roadmap issues...');
  
  // Get all issues with repository links
  const issues = await fetchActivity.getAllIssuesWithRepoLinks(
    github, 
    context.repo.owner, 
    context.repo.repo
  );
  
  console.log(`Found ${issues.length} issues with repository links`);
  
  let updatedCount = 0;
  let errorCount = 0;
  
  for (const issue of issues) {
    try {
      console.log(`Processing issue #${issue.number}: ${issue.title}`);
      console.log(`Repository URL: ${issue.repoUrl}`);
      
      // Fetch latest activity
      const lastActivity = await fetchActivity.getLatestActivity(github, issue.repoUrl);
      
      if (!lastActivity) {
        console.log(`No activity found for issue #${issue.number}`);
        continue;
      }
      
      console.log(`Latest activity: ${lastActivity.toISOString()}`);
      
      // Find project item
      const projectItem = await findProjectItem(github, issue.number, context.repo.repo);
      
      if (!projectItem) {
        console.log(`Project item not found for issue #${issue.number}`);
        continue;
      }
      
      // update the Last Activity field in project
      await updateProjectDateField(
        github,
        projectItem.id,
        LAST_ACTIVITY_FIELD_ID,
        lastActivity.toISOString().split('T')[0] // Format as YYYY-MM-DD
      );
      
      console.log(`✅ Updated activity date for issue #${issue.number}`);
      updatedCount++;
      
      // Rate limit protection
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error(`❌ Error updating issue #${issue.number}:`, error.message);
      errorCount++;
    }
  }
  
  console.log(`\n📊 Activity update summary:`);
  console.log(`- Issues processed: ${issues.length}`);
  console.log(`- Successfully updated: ${updatedCount}`);
  console.log(`- Errors: ${errorCount}`);
  
  return {
    total: issues.length,
    updated: updatedCount,
    errors: errorCount
  };
}

module.exports = {
  updateAllActivityDates,
  findProjectItem,
  updateProjectDateField
};