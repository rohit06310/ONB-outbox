import { getESClient } from '../config/elasticsearch';
import { env } from '../config/env';

export interface EmailDocument {
  id: string;
  userId: string;
  fromEmail: string;
  toEmail: string;
  subject: string;
  body: string;
  status: string;
  scheduledAt: string;
  sentAt?: string;
  createdAt: string;
  batchId?: string;
}

/**
 * Index or update an email document in Elasticsearch.
 */
export async function indexEmail(doc: EmailDocument): Promise<void> {
  try {
    const client = getESClient();
    await client.index({
      index: env.elasticsearch.index,
      id: doc.id,
      document: doc,
    });
  } catch (err: any) {
    console.error('⚠️   ES indexing failed:', err.message);
    // Non-fatal — continue without search index
  }
}

/**
 * Full-text search across emails for a given user.
 */
export async function searchEmails(
  userId: string,
  query: string,
  status?: string,
  from = 0,
  size = 20
): Promise<{ hits: EmailDocument[]; total: number }> {
  try {
    const client = getESClient();

    const must: any[] = [
      { term: { userId } },
      {
        multi_match: {
          query,
          fields: ['subject^2', 'body', 'toEmail', 'fromEmail'],
          type: 'best_fields',
          fuzziness: 'AUTO',
        },
      },
    ];

    if (status) {
      must.push({ term: { status } });
    }

    const result = await client.search<EmailDocument>({
      index: env.elasticsearch.index,
      from,
      size,
      query: { bool: { must } },
      sort: [{ createdAt: { order: 'desc' } }],
    });

    const hits = result.hits.hits.map((h) => h._source as EmailDocument);
    const total =
      typeof result.hits.total === 'number'
        ? result.hits.total
        : (result.hits.total as any)?.value ?? 0;

    return { hits, total };
  } catch (err: any) {
    console.error('⚠️   ES search failed:', err.message);
    return { hits: [], total: 0 };
  }
}
