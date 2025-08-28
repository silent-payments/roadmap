/**
 * Sync issue data to GitHub Project
 */

// Project and field mappings
const PROJECT_ID = 'PVT_kwDOCFSeTs4BBcFj';

const STATUS_FIELD_ID = 'PVTSSF_lADOCFSeTs4BBcFjzgz8btU';
const RELEASE_PHASE_FIELD_ID = 'PVTSSF_lADOCFSeTs4BBcFjzg0AeAM';
const AREA_FIELD_ID = 'PVTSSF_lADOCFSeTs4BBcFjzg0IqfQ';

// Map status values to project field IDs
const statusMapping = {
  'Planned': '3edbf0a4',
  'Idea': 'f75ad846', 
  'In Progress': '47fc9ee4',
  'Stable': '54a9ef9d',
  'Done': '98236657'
};

// Map release phase values to project field IDs
const releasePhaseMapping = {
  'Past': 'fa4e744f',
  'Q3 2025 - Jul-Sep': '54168441',
  'Q4 2025 - Oct-Dec': '52873e45', 
  'Q1 2026 - Jan-Mar': '6c3853d6',
  'Q2 2026 - Apr-Jun': 'f9b29ad3',
  'Future': '66167c54'
};

// Map area values to project field IDs
const areaMapping = {
  'Documentation': '25822f27',
  'Indexer': '7dd65772',
  'Library': '6b9c1ecd',
  'Research': '34bed0cf',
  'Wallet': '122db9e4'
};

// Add issue to project
async function addToProject(github, issueNodeId) {
  try {
    const addToProjectMutation = `
      mutation($projectId: ID!, $contentId: ID!) {
        addProjectV2ItemById(input: {
          projectId: $projectId
          contentId: $contentId
        }) {
          item {
            id
          }
        }
      }
    `;
    
    const addResult = await github.graphql(addToProjectMutation, {
      projectId: PROJECT_ID,
      contentId: issueNodeId
    });
    
    console.log('Added to project:', addResult.addProjectV2ItemById.item.id);
    return true;
  } catch (error) {
    if (error.message.includes('already exists')) {
      console.log('Issue already in project');
      return true;
    } else {
      throw error;
    }
  }
}

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

// Update project field
async function updateProjectField(github, projectItemId, fieldId, valueId) {
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
    value: { singleSelectOptionId: valueId }
  });
}

// Update area field (now that Area field exists in project)
async function updateAreaField(github, projectItemId, area) {
  if (!area || !areaMapping[area]) return;

  await updateProjectField(
    github,
    projectItemId,
    AREA_FIELD_ID,
    areaMapping[area]
  );
  
  console.log(`Updated Area to: ${area}`);
}

// Main sync function
async function syncToProject(github, context, issueData, formData) {
  console.log('Syncing to project:', formData);
  
  // Add to project
  await addToProject(github, issueData.node_id);
  
  // Find project item
  const projectItem = await findProjectItem(github, issueData.number, context.repo.repo);
  
  if (!projectItem) {
    console.log('Project item not found, may need to wait');
    return;
  }
  
  // Update Status field
  if (formData.status && statusMapping[formData.status]) {
    await updateProjectField(
      github, 
      projectItem.id, 
      STATUS_FIELD_ID, 
      statusMapping[formData.status]
    );
    console.log(`Updated Status to: ${formData.status}`);
  }
  
  // Update Release Phase field
  if (formData.release_phase && releasePhaseMapping[formData.release_phase]) {
    await updateProjectField(
      github,
      projectItem.id,
      RELEASE_PHASE_FIELD_ID,
      releasePhaseMapping[formData.release_phase]
    );
    console.log(`Updated Release Phase to: ${formData.release_phase}`);
  }
  
  // Update Area field
  await updateAreaField(github, projectItem.id, formData.area);
}

module.exports = {
  syncToProject,
  statusMapping,
  releasePhaseMapping,
  areaMapping
};