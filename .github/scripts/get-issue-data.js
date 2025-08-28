/**
 * Get issue data from different trigger contexts
 */

async function getIssueData(github, context, inputs) {
  let issue;
  
  if (context.eventName === 'workflow_dispatch') {
    // Manual trigger - get issue by number
    const issueNumber = inputs.issue_number || '23';
    console.log('Manual trigger for issue:', issueNumber);
    
    const response = await github.rest.issues.get({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: parseInt(issueNumber)
    });
    issue = response.data;
  } else {
    // Issue event trigger
    issue = context.payload.issue;
  }
  
  console.log('Issue data:', {
    number: issue.number,
    node_id: issue.node_id,
    title: issue.title
  });
  
  return {
    number: issue.number,
    node_id: issue.node_id,
    body: issue.body || '',
    title: issue.title
  };
}

module.exports = {
  getIssueData
};