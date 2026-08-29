import { Client } from '@elastic/elasticsearch';
import { env } from './env';

let esClient: Client | null = null;

export function getESClient(): Client {
  if (!esClient) {
    esClient = new Client({ node: env.elasticsearch.url });
  }
  return esClient;
}

export async function ensureESIndex(): Promise<void> {
  const client = getESClient();
  const indexName = env.elasticsearch.index;

  try {
    const exists = await client.indices.exists({ index: indexName });
    if (!exists) {
      await client.indices.create({
        index: indexName,
        body: {
          mappings: {
            properties: {
              id:          { type: 'keyword' },
              userId:      { type: 'keyword' },
              fromEmail:   { type: 'keyword' },
              toEmail:     { type: 'keyword' },
              subject:     { type: 'text', analyzer: 'standard' },
              body:        { type: 'text', analyzer: 'standard' },
              status:      { type: 'keyword' },
              scheduledAt: { type: 'date' },
              sentAt:      { type: 'date' },
              createdAt:   { type: 'date' },
              batchId:     { type: 'keyword' },
            },
          },
          settings: {
            number_of_shards: 1,
            number_of_replicas: 0,
          },
        },
      });
      console.log(`✅  Elasticsearch index "${indexName}" created`);
    } else {
      console.log(`✅  Elasticsearch index "${indexName}" already exists`);
    }
  } catch (err: any) {
    console.error('❌  Elasticsearch index setup error:', err.message);
    // Non-fatal — app continues without ES
  }
}
