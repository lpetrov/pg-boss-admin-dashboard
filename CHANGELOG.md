# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2025-11-18

### Added
- Table column sorting (all columns including duration)
- Server-side sorting for efficient handling of large datasets
- Clear queue functionality with three options: pending, active, or all jobs
- Job retry functionality - queue failed/cancelled jobs for retry
- Job cancel functionality - cancel pending/active jobs
- Sidebar stats showing all job states (active, created, completed, failed)
- Duration column sorting

### Changed
- Unified stat card order across all pages: Active, Pending, Completed, Failed
- Improved sorting to work across all pages, not just current page
- Enhanced clear queue modal with better confirmation messages

### Fixed
- Sidebar now shows completed count
- "Created" terminology matches pg-boss states properly
- Table sorting now works correctly with pagination

## [1.0.0] - 2025-11-18

### Added
- Initial release of pg-boss-admin-dashboard
- Real-time monitoring of pg-boss job queues
- CLI tool for easy installation and usage
- Interactive charts showing job processing trends
- Advanced filtering with state, date range, and JMESPath queries
- Job details modal with complete metadata
- Auto-refresh functionality
- Dark theme UI
- Queue health indicators
- Export jobs to CSV
- Bulk job selection
- Responsive design for mobile and desktop

### Security
- Added security documentation
- Documented known security considerations for production use

### Documentation
- Comprehensive README with installation and usage instructions
- CONTRIBUTING guidelines for contributors
- Security policy and best practices
- Example configurations

## [Unreleased]

### Planned
- Authentication and authorization support
- Rate limiting for API endpoints
- WebSocket support for real-time updates
- Customizable refresh intervals
- Multi-language support
- Docker support
- Helm charts for Kubernetes deployment