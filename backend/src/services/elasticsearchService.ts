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
 * Elasticsearch is optional.
 */
export async function indexEmail(doc: EmailDocument): Promise<void> {
  // Skip if Elasticsearch is disabled
  if (!env.elasticsearch.url) {
    return;
  }

  try {
    const client = getESClient();

    if (!client) {
      return;
    }

    await client.index({
      index: env.elasticsearch.index,
      id: doc.id,
      document: doc,
    });
  } catch (err: any) {
    console.error('⚠️ ES indexing failed:', err.message);
    // Non-fatal — continue without search index
  }
}

/**
 * Full-text search across emails for a given user.
 * Returns an empty result when Elasticsearch is disabled.
 */
export async function searchEmails(
  userId: string,
  query: string,
  status?: string,
  from = 0,
  size = 20
): Promise<{ hits: EmailDocument[]; total: number }> {
  // Elasticsearch disabled
  if (!env.elasticsearch.url) {
    console.log('ℹ️ Elasticsearch disabled — skipping search');
    return {
      hits: [],
      total: 0,
    };
  }

  try {
    const client = getESClient();

    if (!client) {
      return {
        hits: [],
        total: 0,
      };
    }

    const must: any[] = [
      {
        term: {
          userId,
        },
      },
      {
        multi_match: {
          query,
          fields: [
            'subject^2',
            'body',
            'toEmail',
            'fromEmail',
          ],
          type: 'best_fields',
          fuzziness: 'AUTO',
        },
      },
    ];

    if (status) {
      must.push({
        term: {
          status,
        },
      });
    }

    const result = await client.search<EmailDocument>({
      index: env.elasticsearch.index,
      from,
      size,
      query: {
        bool: {
          must,
        },
      },
      sort: [
        {
          createdAt: {
            order: 'desc',
          },
        },
      ],
    });

    const hits = result.hits.hits
      .map((h) => h._source)
      .filter(
        (source): source is EmailDocument =>
          source !== undefined
      );

    const total =
      typeof result.hits.total === 'number'
        ? result.hits.total
        : result.hits.total?.value ?? 0;

    return {
      hits,
      total,
    };
  } catch (err: any) {
    console.error('⚠️ ES search failed:', err.message);

    return {
      hits: [],
      total: 0,
    };
  }
}