// Global state
let currentQueue = null;
let allQueues = [];
let allJobs = [];
let selectedJobs = new Set();
let queueChart = null;
let globalChart = null;
let refreshInterval = null;
let activeFilters = {};
let bulkSelectionMode = false;
let currentPage = 1;
let currentTab = 'stats';
let sortColumn = 'createdon';
let sortDirection = 'desc';
const ITEMS_PER_PAGE = 50;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    setupEventListeners();
    setupRouting();
    startAutoRefresh();
});

function initializeApp() {
    // Restore interval from localStorage
    const savedInterval = localStorage.getItem('pgboss-interval') || 'hour';
    document.getElementById('intervalSelect').value = savedInterval;

    loadQueues();
    loadGlobalStats();

    // Set default date range
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    document.getElementById('dateFrom').value = formatDateTimeLocal(weekAgo);
    document.getElementById('dateTo').value = formatDateTimeLocal(now);
}

function setupEventListeners() {
    // Refresh and interval
    document.getElementById('refreshBtn').addEventListener('click', refresh);
    document.getElementById('intervalSelect').addEventListener('change', (e) => {
        // Save to localStorage
        localStorage.setItem('pgboss-interval', e.target.value);

        // Refresh appropriate chart
        if (currentQueue && currentTab === 'stats') {
            loadQueueStats();
        } else if (!currentQueue) {
            loadGlobalStats();
        }
    });

    // Queue search
    document.getElementById('queueSearch').addEventListener('input', filterQueues);

    // Job filters
    document.getElementById('jobSearch').addEventListener('input', debounce(() => {
        currentPage = 1;
        if (currentQueue && currentTab === 'jobs') {
            const newUrl = '#' + buildJobsUrl();
            window.history.replaceState(null, '', newUrl);
            loadJobs(currentQueue);
        }
    }, 300));

    document.getElementById('stateFilter').addEventListener('change', () => {
        currentPage = 1;
        if (currentQueue && currentTab === 'jobs') {
            const newUrl = '#' + buildJobsUrl();
            window.history.replaceState(null, '', newUrl);
            loadJobs(currentQueue);
        }
    });

    document.getElementById('dateFrom').addEventListener('change', () => {
        currentPage = 1;
        if (currentQueue && currentTab === 'jobs') {
            const newUrl = '#' + buildJobsUrl();
            window.history.replaceState(null, '', newUrl);
            loadJobs(currentQueue);
        }
    });

    document.getElementById('dateTo').addEventListener('change', () => {
        currentPage = 1;
        if (currentQueue && currentTab === 'jobs') {
            const newUrl = '#' + buildJobsUrl();
            window.history.replaceState(null, '', newUrl);
            loadJobs(currentQueue);
        }
    });

    // Bulk selection
    document.getElementById('selectAllJobs').addEventListener('change', toggleSelectAll);
    document.getElementById('bulkSelectBtn').addEventListener('click', toggleBulkSelection);
    document.getElementById('bulkCancelBtn').addEventListener('click', showBulkModal);

    // Export
    document.getElementById('exportBtn').addEventListener('click', exportJobs);

    // Clear queue
    document.getElementById('clearQueueBtn').addEventListener('click', showClearQueueModal);

    // Modal handling
    document.querySelectorAll('.close-btn').forEach(btn => {
        btn.addEventListener('click', (e) => closeModal(e.target.closest('.modal')));
    });

    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal || e.target.classList.contains('modal-backdrop')) {
                closeModal(modal);
            }
        });
    });

    // ESC key to close modals
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const openModal = document.querySelector('.modal[style*="block"]');
            if (openModal) {
                closeModal(openModal);
            }
        }
    });
}

// URL Routing
function setupRouting() {
    // Handle initial route
    handleRoute();

    // Handle browser back/forward
    window.addEventListener('popstate', handleRoute);
}

function handleRoute() {
    const hash = window.location.hash || '#overview';
    const [path, queryString] = hash.substring(1).split('?');
    const parts = path.split('/');

    // Parse query parameters
    const params = new URLSearchParams(queryString || '');

    if (parts[0] === 'overview') {
        showOverview();
    } else if (parts[0] === 'queue' && parts[1]) {
        const queueName = decodeURIComponent(parts[1]);
        if (parts[2] === 'jobs') {
            // Apply filters from URL
            if (params.has('search')) {
                document.getElementById('jobSearch').value = params.get('search');
            }
            if (params.has('state')) {
                document.getElementById('stateFilter').value = params.get('state');
            }
            if (params.has('from')) {
                document.getElementById('dateFrom').value = params.get('from');
            }
            if (params.has('to')) {
                document.getElementById('dateTo').value = params.get('to');
            }
            if (params.has('page')) {
                currentPage = parseInt(params.get('page')) || 1;
            }

            if (parts[3]) {
                // Show specific job: #queue/queuename/jobs/jobid
                selectQueue(queueName, false, true);
                showJobDetails(parts[3], false);
            } else {
                // Show jobs list: #queue/queuename/jobs
                selectQueue(queueName, false, true);
            }
        } else {
            // Show queue stats: #queue/queuename
            selectQueue(queueName, false, false);
        }
    } else {
        // Default to overview
        showOverview();
        window.location.hash = '#overview';
    }
}

function updateRoute(route) {
    if (window.location.hash !== route) {
        window.location.hash = route;
    }
}

function buildJobsUrl() {
    if (!currentQueue) return '';

    const params = new URLSearchParams();

    const search = document.getElementById('jobSearch').value;
    if (search) params.set('search', search);

    const state = document.getElementById('stateFilter').value;
    if (state) params.set('state', state);

    const dateFrom = document.getElementById('dateFrom').value;
    if (dateFrom) params.set('from', dateFrom);

    const dateTo = document.getElementById('dateTo').value;
    if (dateTo) params.set('to', dateTo);

    if (currentPage > 1) params.set('page', currentPage);

    const queryString = params.toString();
    const baseUrl = `queue/${encodeURIComponent(currentQueue)}/jobs`;

    return queryString ? `${baseUrl}?${queryString}` : baseUrl;
}

function showOverview() {
    currentQueue = null;
    document.getElementById('currentQueueBreadcrumb').textContent = 'Overview';
    document.getElementById('queueView').style.display = 'none';
    document.getElementById('overviewContent').style.display = 'block';
    document.querySelectorAll('.queue-item').forEach(item => {
        item.classList.remove('active');
    });
    loadGlobalStats();
}

// Tab Management
function switchTab(tab) {
    currentTab = tab;

    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');

    // Show/hide content
    if (tab === 'stats') {
        document.getElementById('statsTab').style.display = 'flex';
        document.getElementById('jobsTab').style.display = 'none';
        if (currentQueue) {
            updateRoute(`#queue/${encodeURIComponent(currentQueue)}`);
            loadQueueStats();
        }
    } else {
        document.getElementById('statsTab').style.display = 'none';
        document.getElementById('jobsTab').style.display = 'flex';
        if (currentQueue) {
            updateRoute(buildJobsUrl());
            loadJobs(currentQueue);
        }
    }
}

// Queue Management
async function loadQueues() {
    try {
        const response = await fetch('/api/queues');
        allQueues = await response.json();

        updateQueueCount(allQueues.length);
        displayQueues(allQueues);
        updateOverviewStats(allQueues);
    } catch (error) {
        console.error('Error loading queues:', error);
        document.getElementById('queueList').innerHTML =
            '<div class="loading">Error loading queues</div>';
    }
}

function displayQueues(queues) {
    const container = document.getElementById('queueList');

    if (queues.length === 0) {
        container.innerHTML = '<div class="loading">No queues found</div>';
        return;
    }

    container.innerHTML = queues.map(queue => {
        const hasFailures = queue.failed > 0;
        const hasActive = queue.active > 0;
        const healthClass = hasFailures ? 'critical' : (hasActive ? 'warning' : 'healthy');

        return `
            <div class="queue-item ${queue.queue === currentQueue ? 'active' : ''}" 
                 onclick="selectQueue('${queue.queue}', true, false)">
                <div class="queue-name">
                    ${queue.queue}
                    <span class="queue-health ${healthClass}"></span>
                </div>
                <div class="queue-stats">
                    <span class="queue-stat">
                        <span style="color: var(--accent-info)">●</span> ${queue.active}
                    </span>
                    <span class="queue-stat">
                        <span style="color: var(--accent-warning)">●</span> ${queue.created || 0}
                    </span>
                    <span class="queue-stat">
                        <span style="color: var(--accent-success)">●</span> ${queue.completed}
                    </span>
                    <span class="queue-stat">
                        <span style="color: var(--accent-danger)">●</span> ${queue.failed}
                    </span>
                </div>
            </div>
        `;
    }).join('');
}

function filterQueues() {
    const searchTerm = document.getElementById('queueSearch').value.toLowerCase();
    const filtered = allQueues.filter(q => q.queue.toLowerCase().includes(searchTerm));
    displayQueues(filtered);
}

function updateQueueCount(count) {
    document.querySelector('.queue-count').textContent = count.toString();
}

function updateOverviewStats(queues) {
    const totals = queues.reduce((acc, queue) => ({
        active: acc.active + queue.active,
        completed: acc.completed + queue.completed,
        failed: acc.failed + queue.failed,
        pending: acc.pending + (queue.created || 0) + (queue.retry || 0)
    }), { active: 0, completed: 0, failed: 0, pending: 0 });

    // Use standard number formatting without locale-specific formatting
    document.getElementById('totalActive').textContent = totals.active.toString();
    document.getElementById('totalCompleted').textContent = totals.completed.toString();
    document.getElementById('totalFailed').textContent = totals.failed.toString();
    document.getElementById('totalPending').textContent = totals.pending.toString();
}

async function selectQueue(queueName, updateUrl = true, showJobs = false) {
    currentQueue = queueName;
    currentPage = 1;
    selectedJobs.clear();

    // Update UI
    document.querySelectorAll('.queue-item').forEach(item => {
        item.classList.remove('active');
    });

    // Find and activate the queue item
    const queueItems = document.querySelectorAll('.queue-item');
    queueItems.forEach(item => {
        if (item.textContent.includes(queueName)) {
            item.classList.add('active');
        }
    });

    // Update breadcrumb
    const breadcrumb = document.getElementById('currentQueueBreadcrumb');
    breadcrumb.innerHTML = `<a href="#queue/${encodeURIComponent(queueName)}">${queueName}</a>`;

    document.getElementById('queueView').style.display = 'flex';
    document.getElementById('overviewContent').style.display = 'none';

    // Set active tab
    if (showJobs) {
        currentTab = 'jobs';
        document.getElementById('statsTab').style.display = 'none';
        document.getElementById('jobsTab').style.display = 'flex';
        document.querySelectorAll('.tab-btn')[0].classList.remove('active');
        document.querySelectorAll('.tab-btn')[1].classList.add('active');
        loadJobs(queueName);
    } else {
        currentTab = 'stats';
        document.getElementById('statsTab').style.display = 'flex';
        document.getElementById('jobsTab').style.display = 'none';
        document.querySelectorAll('.tab-btn')[0].classList.add('active');
        document.querySelectorAll('.tab-btn')[1].classList.remove('active');
        loadQueueStats();
    }

    // Update URL
    if (updateUrl) {
        if (showJobs) {
            updateRoute(`#queue/${encodeURIComponent(queueName)}/jobs`);
        } else {
            updateRoute(`#queue/${encodeURIComponent(queueName)}`);
        }
    }
}

// Job Management
async function loadJobs(queueName) {
    const state = document.getElementById('stateFilter').value;
    const search = document.getElementById('jobSearch').value;
    const dateFrom = document.getElementById('dateFrom').value;
    const dateTo = document.getElementById('dateTo').value;
    const offset = (currentPage - 1) * ITEMS_PER_PAGE;

    let url = `/api/jobs/${encodeURIComponent(queueName)}?limit=${ITEMS_PER_PAGE}&offset=${offset}`;
    if (state) url += `&state=${state}`;
    if (sortColumn) {
        url += `&sortBy=${sortColumn}&sortDir=${sortDirection}`;
    }

    try {
        const response = await fetch(url);
        const jobs = await response.json();

        // Store all jobs for filtering
        allJobs = jobs;

        // Apply client-side filtering
        let filteredJobs = jobs;

        // JMESPath or text search
        if (search) {
            if (search.startsWith('jq:')) {
                // JMESPath query
                const query = search.substring(3).trim();
                try {
                    filteredJobs = filteredJobs.filter(job => {
                        try {
                            const result = jmespath.search(job, query);

                            // For comparison operations (==, !=, <, >), JMESPath returns a boolean
                            // For simple property access, it returns the value
                            // We only want to filter when result is explicitly true for comparisons
                            // or when we have a value for property access queries
                            if (query.includes('==') || query.includes('!=') || query.includes('<') || query.includes('>')) {
                                return result === true;
                            }
                            // For non-comparison queries, check if value exists and is truthy
                            return result !== null && result !== undefined && result !== false;
                        } catch (err) {
                            return false;
                        }
                    });
                } catch (e) {
                    console.error('Invalid JMESPath query:', e);
                }
            } else {
                // Text search in ID, data, and output
                const searchLower = search.toLowerCase();
                filteredJobs = filteredJobs.filter(job =>
                    job.id.toLowerCase().includes(searchLower) ||
                    JSON.stringify(job.data || {}).toLowerCase().includes(searchLower) ||
                    JSON.stringify(job.output || {}).toLowerCase().includes(searchLower)
                );
            }
        }

        // Date filtering
        if (dateFrom) {
            filteredJobs = filteredJobs.filter(job =>
                new Date(job.createdon) >= new Date(dateFrom)
            );
        }

        if (dateTo) {
            filteredJobs = filteredJobs.filter(job =>
                new Date(job.createdon) <= new Date(dateTo)
            );
        }

        displayJobs(filteredJobs);
        updatePagination(filteredJobs.length === ITEMS_PER_PAGE);
        updateActiveFilters();
    } catch (error) {
        console.error('Error loading jobs:', error);
        document.getElementById('jobsTableBody').innerHTML =
            '<tr><td colspan="8" class="empty-message">Error loading jobs</td></tr>';
    }
}

function displayJobs(jobs) {
    const tbody = document.getElementById('jobsTableBody');

    if (jobs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="empty-message">No jobs found</td></tr>';
        return;
    }

    tbody.innerHTML = jobs.map(job => {
        const duration = job.completedon && job.startedon
            ? formatDuration(new Date(job.completedon) - new Date(job.startedon))
            : '-';

        const isSelected = selectedJobs.has(job.id);

        return `
            <tr class="${isSelected ? 'selected' : ''}" data-job-id="${job.id}">
                <td class="checkbox-col">
                    ${bulkSelectionMode ? 
                        `<input type="checkbox" ${isSelected ? 'checked' : ''} 
                                onchange="toggleJobSelection('${job.id}')" />` 
                        : ''}
                </td>
                <td>
                    <a href="#" onclick="showJobDetails('${job.id}', true); return false;" 
                       title="${job.id}">${job.id.substring(0, 8)}...</a>
                </td>
                <td><span class="state-badge ${job.state}">${job.state}</span></td>
                <td>${job.priority}</td>
                <td>${job.retrycount}/${job.retrylimit}</td>
                <td title="${formatDate(job.createdon)}">${formatRelativeTime(job.createdon)}</td>
                <td>${duration}</td>
                <td>
                    <button class="icon-btn" onclick="showJobActions('${job.id}')">⋮</button>
                </td>
            </tr>
        `;
    }).join('');

    // Update sort indicators
    updateSortIndicators();
}

// Sorting
function sortJobs(column) {
    // Toggle direction if same column, otherwise default to desc
    if (sortColumn === column) {
        sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        sortColumn = column;
        sortDirection = 'desc';
    }

    // Reload jobs with new sort order
    if (currentQueue) {
        loadJobs(currentQueue);
    }
}

function updateSortIndicators() {
    // Clear all indicators
    document.querySelectorAll('.sort-indicator').forEach(indicator => {
        indicator.textContent = '';
    });

    // Set active indicator
    const activeIndicator = document.querySelector(`.sort-indicator[data-column="${sortColumn}"]`);
    if (activeIndicator) {
        activeIndicator.textContent = sortDirection === 'asc' ? ' ▲' : ' ▼';
    }
}

// Bulk Selection
function toggleBulkSelection() {
    bulkSelectionMode = !bulkSelectionMode;
    selectedJobs.clear();

    document.getElementById('bulkSelectBtn').classList.toggle('active', bulkSelectionMode);
    document.getElementById('bulkCancelBtn').style.display = bulkSelectionMode ? 'inline-flex' : 'none';
    document.getElementById('selectAllJobs').parentElement.style.display = bulkSelectionMode ? 'table-cell' : 'none';

    if (currentQueue) loadJobs(currentQueue);
}

function toggleJobSelection(jobId) {
    if (selectedJobs.has(jobId)) {
        selectedJobs.delete(jobId);
    } else {
        selectedJobs.add(jobId);
    }

    const row = document.querySelector(`tr[data-job-id="${jobId}"]`);
    if (row) {
        row.classList.toggle('selected', selectedJobs.has(jobId));
    }

    updateBulkSelectionUI();
}

function toggleSelectAll() {
    const selectAll = document.getElementById('selectAllJobs').checked;
    const visibleJobs = allJobs;

    if (selectAll) {
        visibleJobs.forEach(job => selectedJobs.add(job.id));
    } else {
        selectedJobs.clear();
    }

    if (currentQueue) loadJobs(currentQueue);
}

function updateBulkSelectionUI() {
    const count = selectedJobs.size;
    document.getElementById('bulkCancelBtn').textContent =
        count > 0 ? `Cancel Selected (${count})` : 'Cancel Selected';
}

function showBulkModal() {
    if (selectedJobs.size === 0) {
        alert('No jobs selected');
        return;
    }

    document.getElementById('selectedCount').textContent = selectedJobs.size;
    document.getElementById('bulkModal').style.display = 'block';
}

async function bulkCancel() {
    if (!confirm(`Are you sure you want to cancel ${selectedJobs.size} jobs?`)) return;

    // Note: Actual implementation would need backend support
    alert(`Bulk cancel functionality not implemented - requires pg-boss instance access`);
    closeModal(document.getElementById('bulkModal'));
    toggleBulkSelection();
}

async function bulkRetry() {
    if (!confirm(`Are you sure you want to retry ${selectedJobs.size} jobs?`)) return;

    // Note: Actual implementation would need backend support
    alert(`Bulk retry functionality not implemented - requires pg-boss instance access`);
    closeModal(document.getElementById('bulkModal'));
    toggleBulkSelection();
}

// Job Details and Actions
async function showJobDetails(jobId, updateUrl = true) {
    try {
        const response = await fetch(`/api/job/${jobId}`);
        const job = await response.json();

        // Update URL if needed
        if (updateUrl && currentQueue) {
            updateRoute(`#queue/${encodeURIComponent(currentQueue)}/jobs/${jobId}`);
        }

        const detailsHtml = `
            <div class="job-detail">
                <span class="job-detail-label">ID</span>
                <span class="job-detail-value">${job.id}</span>
            </div>
            <div class="job-detail">
                <span class="job-detail-label">Queue</span>
                <span class="job-detail-value">${job.name}</span>
            </div>
            <div class="job-detail">
                <span class="job-detail-label">State</span>
                <span class="job-detail-value"><span class="state-badge ${job.state}">${job.state}</span></span>
            </div>
            <div class="job-detail">
                <span class="job-detail-label">Priority</span>
                <span class="job-detail-value">${job.priority}</span>
            </div>
            <div class="job-detail">
                <span class="job-detail-label">Retry</span>
                <span class="job-detail-value">${job.retrycount}/${job.retrylimit} (delay: ${job.retrydelay}s${job.retrybackoff ? ', backoff enabled' : ''})</span>
            </div>
            <div class="job-detail">
                <span class="job-detail-label">Created</span>
                <span class="job-detail-value">${formatDate(job.createdon)} (${formatRelativeTime(job.createdon)})</span>
            </div>
            ${job.startedon ? `
            <div class="job-detail">
                <span class="job-detail-label">Started</span>
                <span class="job-detail-value">${formatDate(job.startedon)}</span>
            </div>` : ''}
            ${job.completedon ? `
            <div class="job-detail">
                <span class="job-detail-label">Completed</span>
                <span class="job-detail-value">${formatDate(job.completedon)}</span>
            </div>` : ''}
            ${job.completedon && job.startedon ? `
            <div class="job-detail">
                <span class="job-detail-label">Duration</span>
                <span class="job-detail-value">${formatDuration(new Date(job.completedon) - new Date(job.startedon))}</span>
            </div>` : ''}
            ${job.singletonkey ? `
            <div class="job-detail">
                <span class="job-detail-label">Singleton Key</span>
                <span class="job-detail-value">${job.singletonkey}</span>
            </div>` : ''}
            <div class="job-detail">
                <span class="job-detail-label">Input Data</span>
                <pre>${makeValuesClickable(JSON.stringify(job.data || {}, null, 2))}</pre>
            </div>
            ${job.output ? `
            <div class="job-detail">
                <span class="job-detail-label">Output</span>
                <pre>${makeValuesClickable(JSON.stringify(job.output, null, 2))}</pre>
            </div>` : ''}
        `;

        document.getElementById('jobDetails').innerHTML = detailsHtml;

        // Add action buttons
        const actionsContainer = document.getElementById('jobActions');
        actionsContainer.innerHTML = '';

        if (job.state === 'failed' || job.state === 'cancelled') {
            actionsContainer.innerHTML += `<button class="primary-btn" onclick="retryJob('${job.id}')">🔄 Retry Job</button>`;
        }

        if (job.state === 'active' || job.state === 'created' || job.state === 'retry') {
            actionsContainer.innerHTML += `<button class="danger-btn" onclick="cancelJob('${job.id}')">❌ Cancel Job</button>`;
        }

        actionsContainer.innerHTML += `<button class="secondary-btn" onclick="copyJobData('${job.id}')">📋 Copy Data</button>`;

        document.getElementById('jobModal').style.display = 'block';
        document.getElementById('jobModal').focus();
    } catch (error) {
        console.error('Error loading job details:', error);
        alert('Error loading job details');
    }
}

function makeValuesClickable(jsonString) {
    // Parse the JSON to work with the actual structure
    let obj;
    try {
        obj = JSON.parse(jsonString);
    } catch (e) {
        // If parsing fails, return original string
        return jsonString;
    }

    // Convert back to JSON with custom replacer that adds clickable spans
    function addClickableSpans(key, value, path = '') {
        const currentPath = path ? `${path}.${key}` : key;

        if (value === null) {
            return `<span class="clickable-value" onclick="addFilterRaw('${currentPath}', null)">null</span>`;
        } else if (typeof value === 'string') {
            const encodedValue = btoa(encodeURIComponent(value));
            return `<span class="clickable-value" onclick="addFilterEncoded('${currentPath}', '${encodedValue}')">"${value}"</span>`;
        } else if (typeof value === 'number') {
            return `<span class="clickable-value" onclick="addFilterRaw('${currentPath}', ${value})">${value}</span>`;
        } else if (typeof value === 'boolean') {
            return `<span class="clickable-value" onclick="addFilterRaw('${currentPath}', ${value})">${value}</span>`;
        } else if (Array.isArray(value)) {
            // For arrays, make individual elements clickable
            const items = value.map((item, index) => {
                const arrayPath = `${currentPath}[${index}]`;
                if (typeof item === 'object' && item !== null) {
                    return JSON.stringify(item, null, 2);
                } else {
                    return addClickableSpans(index, item, currentPath);
                }
            });
            return '[' + items.join(', ') + ']';
        } else if (typeof value === 'object') {
            // For objects, recursively process
            const entries = Object.entries(value).map(([k, v]) => {
                const valStr = addClickableSpans(k, v, currentPath);
                return `  "${k}": ${valStr}`;
            });
            return '{\n' + entries.join(',\n') + '\n}';
        }
        return String(value);
    }

    // Simple regex-based approach for better performance and consistency
    let result = jsonString;

    // First pass: handle string values
    result = result.replace(
        /"([^"]+)":\s*"((?:[^"\\]|\\.)*)"/gm,
        (match, key, value) => {
            const encodedValue = btoa(encodeURIComponent(value));
            return `"${key}": <span class="clickable-value" onclick="addFilterEncoded('${key}', '${encodedValue}')">"${value}"</span>`;
        }
    );

    // Second pass: handle numbers, booleans, and null
    result = result.replace(
        /"([^"]+)":\s*([-]?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|true|false|null)(?=\s*[,\n\}])/gm,
        (match, key, value) => {
            return `"${key}": <span class="clickable-value" onclick="addFilterRaw('${key}', ${value})">${value}</span>`;
        }
    );

    // Third pass: handle array elements (strings)
    result = result.replace(
        /(\[[\s\n]*|,\s*)"((?:[^"\\]|\\.)*)"/gm,
        (match, prefix, value) => {
            const encodedValue = btoa(encodeURIComponent(value));
            return `${prefix}<span class="clickable-value" onclick="addFilterArrayString('${encodedValue}')">"${value}"</span>`;
        }
    );

    // Fourth pass: handle array elements (numbers, booleans)
    result = result.replace(
        /(\[[\s\n]*|,\s*)([-]?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|true|false|null)(?=\s*[,\n\]])/gm,
        (match, prefix, value) => {
            return `${prefix}<span class="clickable-value" onclick="addFilterArrayValue(${value})">${value}</span>`;
        }
    );

    return result;
}

function addFilterEncoded(key, encodedValue) {
    // Decode the base64 value
    const value = atob(encodedValue);

    // Add to search box as JMESPath query with double quotes
    const searchBox = document.getElementById('jobSearch');
    searchBox.value = `jq:data.${key} == "${value}"`;

    // Close modal
    closeModal(document.getElementById('jobModal'));

    // Ensure we're on the jobs tab
    if (currentQueue) {
        if (currentTab !== 'jobs') {
            // Switch to jobs tab first
            currentTab = 'jobs';
            document.getElementById('statsTab').style.display = 'none';
            document.getElementById('jobsTab').style.display = 'flex';
            document.querySelectorAll('.tab-btn')[0].classList.remove('active');
            document.querySelectorAll('.tab-btn')[1].classList.add('active');
        }

        currentPage = 1;
        // Update URL with the filter
        setTimeout(() => {
            const newUrl = '#' + buildJobsUrl();
            window.history.replaceState(null, '', newUrl);
            loadJobs(currentQueue);
        }, 0);
    }
}

function addFilterRaw(key, value) {
    // Add to search box as JMESPath query
    const searchBox = document.getElementById('jobSearch');

    // Convert all values to strings for consistent comparison
    if (value === null) {
        searchBox.value = `jq:data.${key} == null`;
    } else {
        searchBox.value = `jq:data.${key} == "${value}"`;
    }

    // Close modal
    closeModal(document.getElementById('jobModal'));

    // Ensure we're on the jobs tab
    if (currentQueue) {
        if (currentTab !== 'jobs') {
            // Switch to jobs tab first
            currentTab = 'jobs';
            document.getElementById('statsTab').style.display = 'none';
            document.getElementById('jobsTab').style.display = 'flex';
            document.querySelectorAll('.tab-btn')[0].classList.remove('active');
            document.querySelectorAll('.tab-btn')[1].classList.add('active');
        }

        currentPage = 1;
        // Update URL with the filter
        setTimeout(() => {
            const newUrl = '#' + buildJobsUrl();
            window.history.replaceState(null, '', newUrl);
            loadJobs(currentQueue);
        }, 0);
    }
}

function addFilterArrayString(encodedValue) {
    // Decode the base64 value
    const value = atob(encodedValue);

    // Add to search box as JMESPath query for array contains
    const searchBox = document.getElementById('jobSearch');
    searchBox.value = `jq:contains(data[*], "${value}")`;

    // Close modal
    closeModal(document.getElementById('jobModal'));

    // Ensure we're on the jobs tab and reload
    if (currentQueue) {
        if (currentTab !== 'jobs') {
            currentTab = 'jobs';
            document.getElementById('statsTab').style.display = 'none';
            document.getElementById('jobsTab').style.display = 'flex';
            document.querySelectorAll('.tab-btn')[0].classList.remove('active');
            document.querySelectorAll('.tab-btn')[1].classList.add('active');
        }

        currentPage = 1;
        setTimeout(() => {
            const newUrl = '#' + buildJobsUrl();
            window.history.replaceState(null, '', newUrl);
            loadJobs(currentQueue);
        }, 0);
    }
}

function addFilterArrayValue(value) {
    // Add to search box as JMESPath query for array contains
    const searchBox = document.getElementById('jobSearch');
    searchBox.value = `jq:contains(data[*], "${value}")`;

    // Close modal
    closeModal(document.getElementById('jobModal'));

    // Ensure we're on the jobs tab and reload
    if (currentQueue) {
        if (currentTab !== 'jobs') {
            currentTab = 'jobs';
            document.getElementById('statsTab').style.display = 'none';
            document.getElementById('jobsTab').style.display = 'flex';
            document.querySelectorAll('.tab-btn')[0].classList.remove('active');
            document.querySelectorAll('.tab-btn')[1].classList.add('active');
        }

        currentPage = 1;
        setTimeout(() => {
            const newUrl = '#' + buildJobsUrl();
            window.history.replaceState(null, '', newUrl);
            loadJobs(currentQueue);
        }, 0);
    }
}

function showJobActions(jobId) {
    showJobDetails(jobId, true);
}

async function retryJob(jobId) {
    if (!confirm('Are you sure you want to retry this job?')) return;

    try {
        const response = await fetch(`/api/job/${jobId}/retry`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const result = await response.json();

        if (response.ok) {
            alert(result.message || 'Job queued for retry successfully!');
            closeModal(document.getElementById('jobModal'));
            refresh();
        } else {
            alert(`Error: ${result.error || 'Failed to retry job'}`);
        }
    } catch (error) {
        console.error('Error retrying job:', error);
        alert('Failed to retry job. See console for details.');
    }
}

async function cancelJob(jobId) {
    if (!confirm('Are you sure you want to cancel this job?')) return;

    try {
        const response = await fetch(`/api/job/${jobId}/cancel`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const result = await response.json();

        if (response.ok) {
            alert(result.message || 'Job cancelled successfully!');
            closeModal(document.getElementById('jobModal'));
            refresh();
        } else {
            alert(`Error: ${result.error || 'Failed to cancel job'}`);
        }
    } catch (error) {
        console.error('Error cancelling job:', error);
        alert('Failed to cancel job. See console for details.');
    }
}

async function copyJobData(jobId) {
    try {
        const response = await fetch(`/api/job/${jobId}`);
        const job = await response.json();

        const jobData = JSON.stringify(job, null, 2);

        if (navigator.clipboard) {
            await navigator.clipboard.writeText(jobData);
            alert('Job data copied to clipboard!');
        } else {
            const textArea = document.createElement('textarea');
            textArea.value = jobData;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            alert('Job data copied to clipboard!');
        }
    } catch (error) {
        console.error('Error copying job data:', error);
    }
}

// Charts
async function loadGlobalStats() {
    const interval = document.getElementById('intervalSelect').value;
    const url = `/api/stats/${interval}`;

    try {
        const response = await fetch(url);
        const stats = await response.json();

        if (stats.length === 0) {
            updateChart([], [], [], [], [], 'globalChart');
            return;
        }

        const labels = stats.map(s => s.time_label);
        const total = stats.map(s => s.total);
        const completed = stats.map(s => s.completed);
        const failed = stats.map(s => s.failed);
        const active = stats.map(s => s.active);

        updateChart(labels, total, completed, failed, active, 'globalChart');
    } catch (error) {
        console.error('Error loading global stats:', error);
    }
}

async function loadQueueStats() {
    if (!currentQueue) return;

    // First, load queue-specific counts
    loadQueueCounts();

    // Then load the chart data
    const interval = document.getElementById('intervalSelect').value;
    const url = `/api/stats/${interval}?queue=${encodeURIComponent(currentQueue)}`;

    try {
        const response = await fetch(url);
        const stats = await response.json();

        if (stats.length === 0) {
            updateChart([], [], [], [], [], 'queueChart');
            return;
        }

        const labels = stats.map(s => s.time_label);
        const total = stats.map(s => s.total);
        const completed = stats.map(s => s.completed);
        const failed = stats.map(s => s.failed);
        const active = stats.map(s => s.active);

        updateChart(labels, total, completed, failed, active, 'queueChart');
    } catch (error) {
        console.error('Error loading queue stats:', error);
    }
}

async function loadQueueCounts() {
    if (!currentQueue) return;

    try {
        const response = await fetch('/api/queues');
        const queues = await response.json();

        const queue = queues.find(q => q.queue === currentQueue);
        if (queue) {
            document.getElementById('queueActive').textContent = queue.active.toString();
            document.getElementById('queueCompleted').textContent = queue.completed.toString();
            document.getElementById('queueFailed').textContent = queue.failed.toString();
            document.getElementById('queuePending').textContent = (queue.created + queue.retry).toString();
        }
    } catch (error) {
        console.error('Error loading queue counts:', error);
    }
}

function updateChart(labels, total, completed, failed, active, chartId) {
    const ctx = document.getElementById(chartId).getContext('2d');

    // Destroy the appropriate chart
    if (chartId === 'globalChart' && globalChart) {
        globalChart.destroy();
    } else if (chartId === 'queueChart' && queueChart) {
        queueChart.destroy();
    }

    const newChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Completed',
                    data: completed,
                    borderColor: '#3ba55c',
                    backgroundColor: 'rgba(59, 165, 92, 0.1)',
                    tension: 0.4,
                    borderWidth: 2
                },
                {
                    label: 'Failed',
                    data: failed,
                    borderColor: '#ed4245',
                    backgroundColor: 'rgba(237, 66, 69, 0.1)',
                    tension: 0.4,
                    borderWidth: 2
                },
                {
                    label: 'Active',
                    data: active,
                    borderColor: '#00b0f4',
                    backgroundColor: 'rgba(0, 176, 244, 0.1)',
                    tension: 0.4,
                    borderWidth: 2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 16,
                        usePointStyle: true,
                        font: {
                            size: 12
                        }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: 12,
                    cornerRadius: 8,
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0,
                        color: '#a8a8b3'
                    },
                    grid: {
                        color: '#2a2a3a'
                    }
                },
                x: {
                    ticks: {
                        color: '#a8a8b3',
                        maxRotation: 45,
                        minRotation: 45
                    },
                    grid: {
                        color: '#2a2a3a'
                    }
                }
            }
        }
    });

    // Store the chart reference
    if (chartId === 'globalChart') {
        globalChart = newChart;
    } else {
        queueChart = newChart;
    }
}

// Filters
function updateActiveFilters() {
    const container = document.getElementById('activeFilters');
    container.innerHTML = '';

    const filters = [];

    const search = document.getElementById('jobSearch').value;
    if (search) {
        filters.push({ type: 'search', value: search });
    }

    const state = document.getElementById('stateFilter').value;
    if (state) {
        filters.push({ type: 'state', value: state });
    }

    const dateFrom = document.getElementById('dateFrom').value;
    if (dateFrom) {
        filters.push({ type: 'dateFrom', value: new Date(dateFrom).toLocaleDateString() });
    }

    const dateTo = document.getElementById('dateTo').value;
    if (dateTo) {
        filters.push({ type: 'dateTo', value: new Date(dateTo).toLocaleDateString() });
    }

    container.innerHTML = filters.map(filter => `
        <div class="filter-tag">
            <span>${filter.type}: ${filter.value}</span>
            <button onclick="removeFilter('${filter.type}')">×</button>
        </div>
    `).join('');
}

function removeFilter(type) {
    switch(type) {
        case 'search':
            document.getElementById('jobSearch').value = '';
            break;
        case 'state':
            document.getElementById('stateFilter').value = '';
            break;
        case 'dateFrom':
            document.getElementById('dateFrom').value = '';
            break;
        case 'dateTo':
            document.getElementById('dateTo').value = '';
            break;
    }

    if (currentQueue && currentTab === 'jobs') {
        currentPage = 1;
        const newUrl = '#' + buildJobsUrl();
        window.history.replaceState(null, '', newUrl);
        loadJobs(currentQueue);
    }
}

// Export
async function exportJobs() {
    if (!currentQueue) {
        alert('Please select a queue first');
        return;
    }

    try {
        // Fetch all jobs (we'll filter client-side)
        const state = document.getElementById('stateFilter').value;
        let url = `/api/jobs/${encodeURIComponent(currentQueue)}?limit=10000`;
        if (state) url += `&state=${state}`;

        const response = await fetch(url);
        let jobs = await response.json();

        // Apply client-side filters (same logic as loadJobs)
        const search = document.getElementById('jobSearch').value;
        const dateFrom = document.getElementById('dateFrom').value;
        const dateTo = document.getElementById('dateTo').value;

        // Apply search filter
        if (search) {
            if (search.startsWith('jq:')) {
                // JMESPath query
                const query = search.substring(3).trim();
                try {
                    jobs = jobs.filter(job => {
                        try {
                            const result = jmespath.search(job, query);
                            return result === true || (result !== false && result !== null && result !== undefined);
                        } catch {
                            return false;
                        }
                    });
                } catch (e) {
                    console.error('Invalid JMESPath query:', e);
                }
            } else {
                // Text search
                const searchLower = search.toLowerCase();
                jobs = jobs.filter(job =>
                    job.id.toLowerCase().includes(searchLower) ||
                    JSON.stringify(job.data || {}).toLowerCase().includes(searchLower) ||
                    JSON.stringify(job.output || {}).toLowerCase().includes(searchLower)
                );
            }
        }

        // Date filtering
        if (dateFrom) {
            jobs = jobs.filter(job =>
                new Date(job.createdon) >= new Date(dateFrom)
            );
        }

        if (dateTo) {
            jobs = jobs.filter(job =>
                new Date(job.createdon) <= new Date(dateTo)
            );
        }

        if (jobs.length === 0) {
            alert('No jobs to export with current filters');
            return;
        }

        // Convert to CSV
        const csv = convertToCSV(jobs);

        // Download
        const blob = new Blob([csv], { type: 'text/csv' });
        const blobUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;

        // Include filter info in filename
        const filterSuffix = search || state || dateFrom || dateTo ? '-filtered' : '';
        a.download = `pgboss-${currentQueue}${filterSuffix}-${new Date().toISOString().split('T')[0]}.csv`;

        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(blobUrl);

        console.log(`Exported ${jobs.length} jobs`);
    } catch (error) {
        console.error('Error exporting jobs:', error);
        alert('Error exporting jobs');
    }
}

function convertToCSV(jobs) {
    const headers = ['ID', 'State', 'Priority', 'Retry Count', 'Retry Limit', 'Created', 'Started', 'Completed', 'Data', 'Output'];
    const rows = jobs.map(job => [
        job.id,
        job.state,
        job.priority,
        job.retrycount,
        job.retrylimit,
        formatDate(job.createdon),
        job.startedon ? formatDate(job.startedon) : '',
        job.completedon ? formatDate(job.completedon) : '',
        JSON.stringify(job.data || {}),
        JSON.stringify(job.output || {})
    ]);

    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    return csvContent;
}

// Pagination
function updatePagination(hasMore) {
    const container = document.getElementById('paginationContainer');
    container.innerHTML = `
        <div class="pagination-info">
            Page ${currentPage} • Showing ${allJobs.length} jobs
        </div>
        <div class="pagination-controls">
            <button class="secondary-btn" onclick="previousPage()" ${currentPage === 1 ? 'disabled' : ''}>
                ← Previous
            </button>
            <button class="secondary-btn" onclick="nextPage()" ${!hasMore ? 'disabled' : ''}>
                Next →
            </button>
        </div>
    `;
}

function previousPage() {
    if (currentPage > 1) {
        currentPage--;
        const newUrl = '#' + buildJobsUrl();
        window.history.replaceState(null, '', newUrl);
        loadJobs(currentQueue);
    }
}

function nextPage() {
    currentPage++;
    const newUrl = '#' + buildJobsUrl();
    window.history.replaceState(null, '', newUrl);
    loadJobs(currentQueue);
}

// Modal Management
function closeModal(modal) {
    if (modal) {
        modal.style.display = 'none';
        // If closing job modal, update URL to remove job ID
        if (modal.id === 'jobModal' && currentQueue) {
            updateRoute(`#queue/${encodeURIComponent(currentQueue)}/jobs`);
        }
    }
}

// Utility Functions
function refresh() {
    loadQueues();

    if (currentQueue) {
        if (currentTab === 'stats') {
            loadQueueStats();
        } else {
            loadJobs(currentQueue);
        }
    } else {
        loadGlobalStats();
    }
}

function startAutoRefresh() {
    refreshInterval = setInterval(refresh, 10000);
}

function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

function formatRelativeTime(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (seconds < 60) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
}

function formatDuration(ms) {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    if (ms < 3600000) return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
    return `${Math.floor(ms / 3600000)}h ${Math.floor((ms % 3600000) / 60000)}m`;
}


// Clear Queue
function showClearQueueModal() {
    if (!currentQueue) {
        alert('No queue selected');
        return;
    }

    document.getElementById('clearQueueName').textContent = currentQueue;
    document.getElementById('clearQueueModal').style.display = 'block';
}

function closeClearQueueModal() {
    document.getElementById('clearQueueModal').style.display = 'none';
}

async function confirmClearQueue() {
    const clearType = document.querySelector('input[name="clearType"]:checked').value;
    const queueName = currentQueue;

    let confirmMessage;
    if (clearType === 'all') {
        confirmMessage = `Are you sure you want to delete ALL jobs in queue "${queueName}"? This action cannot be undone!`;
    } else if (clearType === 'active') {
        confirmMessage = `Are you sure you want to delete all ACTIVE jobs in queue "${queueName}"? This will remove jobs currently being processed! This action cannot be undone!`;
    } else {
        confirmMessage = `Are you sure you want to delete all PENDING jobs in queue "${queueName}"? This action cannot be undone!`;
    }

    if (!confirm(confirmMessage)) {
        return;
    }

    try {
        const response = await fetch(`/api/queue/${encodeURIComponent(queueName)}/clear`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ clearType })
        });

        const result = await response.json();

        if (response.ok) {
            alert(`Successfully cleared ${result.deletedCount} jobs from queue "${queueName}"`);
            closeClearQueueModal();
            // Refresh data
            loadQueues();
            if (currentTab === 'jobs') {
                loadJobs(queueName);
            }
        } else {
            alert(`Error: ${result.error || 'Failed to clear queue'}`);
        }
    } catch (error) {
        console.error('Error clearing queue:', error);
        alert('Failed to clear queue. See console for details.');
    }
}

function formatDateTimeLocal(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}
