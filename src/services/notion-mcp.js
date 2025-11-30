/**
 * Récupère les pages d'une base de données via MCP
 */
async function getPagesViaMCP(databaseId, options = {}) {
  // Si vous utilisez MCP via un serveur local ou une API
  const response = await fetch('/api/mcp/notion', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      tool: 'notion_query_database',
      arguments: {
        database_id: databaseId.replace(/-/g, ''),
        page_size: options.limit || 100,
        sorts: options.sorts || [{
          property: 'last_edited_time',
          direction: 'descending'
        }],
        filter: options.filter || undefined
      }
    })
  })

  return response.json()
}
