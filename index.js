const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');

const app = express();
const port = process.env.PGBOSS_DASHBOARD_PORT || 8671;

// Database connection
if (!process.env.PGBOSS_DATABASE_URL) {
  console.error('ERROR: PGBOSS_DATABASE_URL environment variable is required');
  console.error('Example: PGBOSS_DATABASE_URL=postgres://user:password@localhost:5432/pgboss_db');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.PGBOSS_DATABASE_URL,
});

console.log(`Connecting to database: ${process.env.PGBOSS_DATABASE_URL.replace(/:[^:]*@/, ':***@')}`);

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));
// Serve static files from the package's public directory
const publicPath = path.join(__dirname, 'public');
app.use(express.static(publicPath));

// API Routes
app.get('/api/queues', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        name as queue,
        COUNT(*)::int as total,
        COUNT(*) FILTER (WHERE state = 'active')::int as active,
        COUNT(*) FILTER (WHERE state = 'completed')::int as completed,
        COUNT(*) FILTER (WHERE state = 'failed')::int as failed,
        COUNT(*) FILTER (WHERE state = 'created')::int as created,
        COUNT(*) FILTER (WHERE state = 'retry')::int as retry,
        COUNT(*) FILTER (WHERE state = 'cancelled')::int as cancelled
      FROM pgboss.job
      GROUP BY name
      ORDER BY total DESC
    `);
    
    // Convert string numbers to integers if needed
    const rows = result.rows.map(row => ({
      ...row,
      total: parseInt(row.total, 10),
      active: parseInt(row.active, 10),
      completed: parseInt(row.completed, 10),
      failed: parseInt(row.failed, 10),
      created: parseInt(row.created, 10),
      retry: parseInt(row.retry, 10),
      cancelled: parseInt(row.cancelled, 10)
    }));
    
    res.json(rows);
  } catch (error) {
    console.error('Error fetching queues:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/stats/:interval', async (req, res) => {
  const { interval } = req.params;
  const { queue } = req.query;
  
  let timeFormat;
  let groupBy;
  let limit;
  
  switch(interval) {
    case 'minute':
      timeFormat = 'HH24:MI:SS';
      groupBy = `date_trunc('second', created_on)`;
      limit = 60;
      break;
    case 'hour':
      timeFormat = 'HH24:MI';
      groupBy = `date_trunc('minute', created_on)`;
      limit = 60;
      break;
    case 'day':
      timeFormat = 'HH24:00';
      groupBy = `date_trunc('hour', created_on)`;
      limit = 24;
      break;
    case 'week':
      timeFormat = 'MM-DD';
      groupBy = `date_trunc('day', created_on)`;
      limit = 7;
      break;
    case 'month':
      timeFormat = 'MM-DD';
      groupBy = `date_trunc('day', created_on)`;
      limit = 30;
      break;
    case 'year':
      timeFormat = 'MON';
      groupBy = `date_trunc('month', created_on)`;
      limit = 12;
      break;
    default:
      timeFormat = 'HH24:MI';
      groupBy = `date_trunc('minute', created_on)`;
      limit = 60;
  }
  
  try {
    let query = `
      SELECT 
        ${groupBy} as time_bucket,
        TO_CHAR(${groupBy}, '${timeFormat}') as time_label,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE state = 'completed') as completed,
        COUNT(*) FILTER (WHERE state = 'failed') as failed,
        COUNT(*) FILTER (WHERE state = 'active') as active
      FROM pgboss.job
      WHERE created_on > NOW() - INTERVAL '${limit} ${interval === 'minute' ? 'seconds' : interval === 'week' ? 'days' : interval === 'year' ? 'months' : interval + 's'}'
      ${queue ? `AND name = $1` : ''}
      GROUP BY time_bucket
      ORDER BY time_bucket DESC
      LIMIT ${limit}
    `;
    
    const result = await pool.query(query, queue ? [queue] : []);
    res.json(result.rows.reverse());
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/jobs/:queue', async (req, res) => {
  const { queue } = req.params;
  const { state, limit = 50, offset = 0, sortBy = 'createdon', sortDir = 'desc' } = req.query;

  try {
    // Map frontend column names to database column names
    const columnMap = {
      'id': 'id',
      'state': 'state',
      'priority': 'priority',
      'retrycount': 'retry_count',
      'createdon': 'created_on',
      'startedon': 'started_on',
      'completedon': 'completed_on',
      'duration': '(completed_on - started_on)'
    };

    const dbColumn = columnMap[sortBy] || 'created_on';
    const direction = sortDir === 'asc' ? 'ASC' : 'DESC';

    // For duration sorting, handle NULL values specially
    let orderByClause;
    if (sortBy === 'duration') {
      orderByClause = `${dbColumn} ${direction} NULLS LAST`;
    } else {
      orderByClause = `${dbColumn} ${direction}`;
    }

    let query = `
      SELECT
        id,
        name,
        state,
        priority,
        retry_count as retrycount,
        retry_limit as retrylimit,
        start_after as startafter,
        started_on as startedon,
        created_on as createdon,
        completed_on as completedon,
        data,
        output
      FROM pgboss.job
      WHERE name = $1
      ${state ? `AND state = $2` : ''}
      ORDER BY ${orderByClause}
      LIMIT $${state ? 3 : 2} OFFSET $${state ? 4 : 3}
    `;

    const params = state
      ? [queue, state, limit, offset]
      : [queue, limit, offset];

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching jobs:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/job/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    const result = await pool.query(`
      SELECT 
        id,
        name,
        priority,
        state,
        retry_count as retrycount,
        retry_limit as retrylimit,
        retry_delay as retrydelay,
        retry_backoff as retrybackoff,
        start_after as startafter,
        started_on as startedon,
        singleton_key as singletonkey,
        singleton_on as singletonon,
        expire_seconds as expirein,
        created_on as createdon,
        completed_on as completedon,
        expire_seconds + deletion_seconds as keepuntil,
        data,
        output
      FROM pgboss.job
      WHERE id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching job details:', error);
    res.status(500).json({ error: error.message });
  }
});

// Test database connection on startup
async function testConnection() {
  try {
    const result = await pool.query('SELECT current_database(), current_schema()');
    console.log(`Connected to database: ${result.rows[0].current_database} (schema: ${result.rows[0].current_schema})`);
    
    // Check if pgboss schema exists
    const schemaCheck = await pool.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.schemata 
        WHERE schema_name = 'pgboss'
      )
    `);
    
    if (!schemaCheck.rows[0].exists) {
      console.warn('WARNING: pgboss schema does not exist in the database!');
      console.warn('Make sure pg-boss has been initialized in this database.');
    }
  } catch (error) {
    console.error('Database connection error:', error.message);
  }
}

// Job action endpoints
app.post('/api/job/:id/retry', async (req, res) => {
  const { id } = req.params;

  try {
    // Check if job exists and can be retried
    const jobCheck = await pool.query(
      'SELECT id, state, retry_count, retry_limit FROM pgboss.job WHERE id = $1',
      [id]
    );

    if (jobCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const job = jobCheck.rows[0];

    // Only retry failed or cancelled jobs
    if (job.state !== 'failed' && job.state !== 'cancelled') {
      return res.status(400).json({ error: `Cannot retry job in '${job.state}' state. Only failed or cancelled jobs can be retried.` });
    }

    // Update job to retry state
    const result = await pool.query(
      `UPDATE pgboss.job
       SET state = 'retry',
           retry_count = COALESCE(retry_count, 0) + 1,
           started_on = NULL,
           completed_on = NULL,
           output = NULL
       WHERE id = $1
       RETURNING id, state, retry_count`,
      [id]
    );

    res.json({
      success: true,
      message: 'Job queued for retry',
      job: result.rows[0]
    });
  } catch (error) {
    console.error('Error retrying job:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/job/:id/cancel', async (req, res) => {
  const { id } = req.params;

  try {
    // Check if job exists
    const jobCheck = await pool.query(
      'SELECT id, state FROM pgboss.job WHERE id = $1',
      [id]
    );

    if (jobCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const job = jobCheck.rows[0];

    // Don't cancel already completed jobs
    if (job.state === 'completed') {
      return res.status(400).json({ error: 'Cannot cancel completed job' });
    }

    // Don't cancel already cancelled jobs
    if (job.state === 'cancelled') {
      return res.status(400).json({ error: 'Job is already cancelled' });
    }

    // Update job to cancelled state
    const result = await pool.query(
      `UPDATE pgboss.job
       SET state = 'cancelled',
           completed_on = NOW()
       WHERE id = $1
       RETURNING id, state`,
      [id]
    );

    res.json({
      success: true,
      message: 'Job cancelled successfully',
      job: result.rows[0]
    });
  } catch (error) {
    console.error('Error cancelling job:', error);
    res.status(500).json({ error: error.message });
  }
});

// Clear queue endpoint
app.post('/api/queue/:queue/clear', async (req, res) => {
  const { queue } = req.params;
  const { clearType } = req.body;

  try {
    let query;
    let result;

    if (clearType === 'pending') {
      // Delete only jobs in 'created' or 'retry' state
      query = `
        DELETE FROM pgboss.job
        WHERE name = $1 AND state IN ('created', 'retry')
      `;
      result = await pool.query(query, [queue]);
    } else if (clearType === 'active') {
      // Delete only jobs in 'active' state
      query = `
        DELETE FROM pgboss.job
        WHERE name = $1 AND state = 'active'
      `;
      result = await pool.query(query, [queue]);
    } else if (clearType === 'all') {
      // Delete all jobs for this queue
      query = `
        DELETE FROM pgboss.job
        WHERE name = $1
      `;
      result = await pool.query(query, [queue]);
    } else {
      return res.status(400).json({ error: 'Invalid clearType. Must be "pending", "active", or "all"' });
    }

    res.json({
      success: true,
      deletedCount: result.rowCount,
      clearType,
      queue
    });
  } catch (error) {
    console.error('Error clearing queue:', error);
    res.status(500).json({ error: error.message });
  }
});

// Start server
app.listen(port, async () => {
  console.log('\n========================================');
  console.log('✨ PgBoss Admin Dashboard is running!');
  console.log('========================================');
  console.log(`📊 Dashboard URL: http://localhost:${port}`);
  console.log(`🔌 API endpoint:  http://localhost:${port}/api`);
  console.log('========================================\n');
  
  await testConnection();
  
  // Open browser if not in a headless environment
  if (process.env.PGBOSS_NO_BROWSER !== 'true' && !process.env.CI) {
    try {
      const opener = require('opener');
      setTimeout(() => {
        opener(`http://localhost:${port}`);
      }, 1000);
    } catch (e) {
      // Opener not installed, that's OK
    }
  }
});