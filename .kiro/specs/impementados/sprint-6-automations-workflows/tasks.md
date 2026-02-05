# Implementation Plan: Automation and Workflow System

## Overview

This implementation plan breaks down the Automation and Workflow System into discrete, manageable tasks. Each task builds incrementally on previous work, with checkpoints to ensure tests pass before proceeding.

---

## Tasks

- [ ] 1. Database Schema and Migrations
- [ ] 1.1 Create automations table migration
  - Create table with all fields (name, description, active, trigger_type, trigger_config, conditions, actions)
  - Add indexes for active, trigger_type, created_by
  - Add RLS policies for user access control
  - Add trigger for updated_at
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 11.1, 11.2, 11.3_

- [ ] 1.2 Create automation_logs table migration
  - Create table with execution log fields
  - Add indexes for automation_id, status, executed_at
  - Add RLS policies for log access control
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 11.5_

- [ ] 1.3 Create automation_templates table migration
  - Create table with template fields
  - Add indexes for category, is_public
  - Add RLS policies for template visibility
  - _Requirements: 6.1, 6.2, 6.4, 6.5_

- [ ] 1.4 Write property test for database schema
  - **Property 1: Workflow Storage Completeness**
  - **Validates: Requirements 1.1**

- [ ] 2. Core Services - Event Emitter
- [ ] 2.1 Implement Event Emitter service
  - Create EventEmitter class with emit, on, off methods
  - Implement event type validation
  - Add logging for all emitted events
  - _Requirements: 2.1, 2.2, 2.3_

- [ ] 2.2 Write property test for event emission
  - **Property 6: Event Emission Completeness**
  - **Validates: Requirements 2.1, 2.2, 2.3**

- [ ] 2.3 Integrate Event Emitter with CRM services
  - Modify customer.service.ts to emit customer.created, customer.updated events
  - Modify conversation.service.ts to emit conversation.created, message.received events
  - Modify appointment.service.ts to emit appointment.created, appointment.missed events
  - Modify tag.service.ts to emit tag.applied, tag.removed events
  - _Requirements: 2.1, 2.3, 7.1, 7.2, 7.3_


- [ ] 2.4 Integrate Event Emitter with Sales services
  - Modify order.service.ts to emit order.created, order.paid, order.cancelled events
  - _Requirements: 2.2, 8.1, 8.2_

- [ ] 2.5 Integrate Event Emitter with Affiliates services
  - Modify commission.service.ts to emit commission.calculated event
  - _Requirements: 9.1_

- [ ] 2.6 Write property test for Sales event emission
  - **Property 21: Sales Event Emission**
  - **Validates: Requirements 8.1, 8.2**

- [ ] 2.7 Write property test for Affiliates event emission
  - **Property 22: Affiliates Event Emission**
  - **Validates: Requirements 9.1**

- [ ] 3. Core Services - Condition Evaluator
- [ ] 3.1 Implement Condition Evaluator service
  - Create ConditionEvaluator class with evaluate and evaluateCondition methods
  - Implement numeric operators (>, <, >=, <=, ==, !=)
  - Implement string operators (contains, not_contains, starts_with, ends_with)
  - Implement array operators (in, not_in)
  - Implement logical operators (AND, OR, NOT)
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ] 3.2 Write property test for AND logic
  - **Property 9: AND Logic Correctness**
  - **Validates: Requirements 3.2**

- [ ] 3.3 Write property test for OR logic
  - **Property 10: OR Logic Correctness**
  - **Validates: Requirements 3.3**

- [ ] 3.4 Write property test for numeric operators
  - **Property 11: Numeric Operator Correctness**
  - **Validates: Requirements 3.4**

- [ ] 3.5 Write property test for array operators
  - **Property 12: Array Operator Correctness**
  - **Validates: Requirements 3.5**

- [ ] 4. Core Services - Action Executor
- [ ] 4.1 Implement Action Executor service base
  - Create ActionExecutor class with executeActions and executeAction methods
  - Implement retry logic with exponential backoff
  - Implement error isolation (continue on failure)
  - Add action execution logging
  - _Requirements: 4.1, 4.5, 10.2_

- [ ] 4.2 Implement notification actions
  - Implement send_email action (call email service)
  - Implement send_notification action (call CRM notification service)
  - Implement send_whatsapp action (call N8N integration)
  - Implement template variable replacement
  - _Requirements: 4.2, 14.1, 14.2, 14.3, 14.4, 14.5_

- [ ] 4.3 Implement CRM actions
  - Implement apply_tag action (call CRM tag service)
  - Implement remove_tag action (call CRM tag service)
  - Implement create_note action (call CRM timeline service)
  - Implement create_appointment action (call CRM appointment service)
  - _Requirements: 4.3, 4.4, 7.1, 7.2, 7.3_

- [ ] 4.4 Implement system actions
  - Implement webhook action (HTTP POST to external URL)
  - Implement delay action (pause execution)
  - _Requirements: 4.1_

- [ ] 4.5 Write property test for action execution order
  - **Property 13: Action Execution Order**
  - **Validates: Requirements 4.1**

- [ ] 4.6 Write property test for error isolation
  - **Property 15: Error Isolation**
  - **Validates: Requirements 4.5**

- [ ] 4.7 Write property test for retry logic
  - **Property 24: Retry Logic**
  - **Validates: Requirements 10.2**

- [ ] 4.8 Write property test for template variable replacement
  - **Property 30: Template Variable Replacement**
  - **Validates: Requirements 14.4**

- [ ] 5. Core Services - Queue Manager
- [ ] 5.1 Set up Redis and Bull queue
  - Install Bull and Redis dependencies
  - Configure Redis connection
  - Create queue with retry and backoff configuration
  - _Requirements: 10.1_

- [ ] 5.2 Implement Queue Manager service
  - Create QueueManager class with enqueue, processNext, getStatus methods
  - Implement priority queuing
  - Implement job progress tracking
  - Add queue monitoring and logging
  - _Requirements: 10.1, 10.4_

- [ ] 5.3 Write property test for async queue processing
  - **Property 23: Async Queue Processing**
  - **Validates: Requirements 10.1**

- [ ] 6. Core Services - Workflow Engine
- [ ] 6.1 Implement Workflow Engine service base
  - Create WorkflowEngine class with processTrigger, executeWorkflow methods
  - Implement workflow matching logic (find active workflows by trigger type)
  - Implement execution orchestration (conditions → actions → logging)
  - Add performance monitoring (execution time tracking)
  - _Requirements: 2.5, 3.1, 4.1, 10.3_

- [ ] 6.2 Implement test mode execution
  - Implement testWorkflow method (no side effects)
  - Return test results with conditions evaluation and actions preview
  - Add test execution logging (separate from production)
  - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

- [ ] 6.3 Implement temporal trigger scheduling
  - Implement scheduleTemporalWorkflows method
  - Set up cron jobs for daily, weekly, monthly triggers
  - Implement batch entity processing for temporal workflows
  - _Requirements: 2.4, 15.1, 15.2, 15.3, 15.4, 15.5_

- [ ] 6.4 Implement loop detection
  - Track workflow execution chain
  - Detect when workflow triggers itself
  - Prevent execution after 3 iterations
  - _Requirements: 10.5_

- [ ] 6.5 Write property test for workflow matching
  - **Property 7: Workflow Matching Accuracy**
  - **Validates: Requirements 2.5**

- [ ] 6.6 Write property test for condition evaluation before actions
  - **Property 8: Condition Evaluation Before Actions**
  - **Validates: Requirements 3.1**

- [ ] 6.7 Write property test for loop detection
  - **Property 25: Loop Detection**
  - **Validates: Requirements 10.5**

- [ ] 6.8 Write property test for test execution isolation
  - **Property 29: Test Execution Isolation**
  - **Validates: Requirements 13.1**

- [ ] 7. Checkpoint - Ensure all core services tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 8. Business Logic - Automation Service
- [ ] 8.1 Implement Automation CRUD service
  - Create AutomationService class with create, update, delete, get, list methods
  - Implement validation for workflow configuration
  - Implement activate/deactivate methods
  - Add user ownership tracking
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 11.1_

- [ ] 8.2 Implement access control in Automation service
  - Filter workflows by user (non-admin sees only own)
  - Admin sees all workflows
  - Verify permissions on update/delete
  - _Requirements: 11.2, 11.3, 11.4_

- [ ] 8.3 Write property test for workflow update persistence
  - **Property 2: Workflow Update Persistence**
  - **Validates: Requirements 1.2**

- [ ] 8.4 Write property test for soft delete
  - **Property 3: Soft Delete Prevents Execution**
  - **Validates: Requirements 1.3**

- [ ] 8.5 Write property test for activation
  - **Property 4: Activation Enables Execution**
  - **Validates: Requirements 1.4**

- [ ] 8.6 Write property test for deactivation
  - **Property 5: Deactivation Preserves Configuration**
  - **Validates: Requirements 1.5**

- [ ] 8.7 Write property test for ownership association
  - **Property 26: Ownership Association**
  - **Validates: Requirements 11.1**

- [ ] 8.8 Write property test for access control filtering
  - **Property 27: Access Control Filtering**
  - **Validates: Requirements 11.2**

- [ ] 8.9 Write property test for admin full access
  - **Property 28: Admin Full Access**
  - **Validates: Requirements 11.3**

- [ ] 9. Business Logic - Execution Log Service
- [ ] 9.1 Implement Execution Log service
  - Create ExecutionLogService class with create, get, list methods
  - Implement log filtering (workflow, date range, status)
  - Implement access control (users see only their workflow logs)
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 11.5_

- [ ] 9.2 Write property test for execution logging
  - **Property 16: Execution Logging Completeness**
  - **Validates: Requirements 5.1, 5.2**

- [ ] 9.3 Write property test for log filtering
  - **Property 17: Log Filtering Accuracy**
  - **Validates: Requirements 5.3**

- [ ] 10. Business Logic - Template Manager Service
- [ ] 10.1 Implement Template Manager service
  - Create TemplateManager class with getTemplates, getTemplate, createTemplate, applyTemplate methods
  - Implement template visibility control (public/private)
  - Implement template application with customization
  - Track template usage count
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ] 10.2 Write property test for template application
  - **Property 18: Template Application Creates Workflow**
  - **Validates: Requirements 6.2**

- [ ] 10.3 Write property test for template visibility
  - **Property 19: Template Visibility Control**
  - **Validates: Requirements 6.4**

- [ ] 11. API Layer - Controllers and Routes
- [ ] 11.1 Create Automation controller
  - Implement POST /api/automations (create)
  - Implement GET /api/automations (list with filters)
  - Implement GET /api/automations/:id (get details)
  - Implement PUT /api/automations/:id (update)
  - Implement DELETE /api/automations/:id (soft delete)
  - Implement POST /api/automations/:id/activate (activate)
  - Implement POST /api/automations/:id/deactivate (deactivate)
  - Implement POST /api/automations/:id/test (test workflow)
  - Add request validation with Zod schemas
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 13.1_

- [ ] 11.2 Create Execution Log controller
  - Implement GET /api/automations/:id/logs (get workflow logs)
  - Implement GET /api/automations/logs (get all logs with filters)
  - Add pagination support
  - _Requirements: 5.3, 5.4_

- [ ] 11.3 Create Template controller
  - Implement GET /api/automations/templates (list templates)
  - Implement GET /api/automations/templates/:id (get template)
  - Implement POST /api/automations/templates (create template)
  - Implement POST /api/automations/templates/:id/apply (apply template)
  - _Requirements: 6.1, 6.2, 6.5_

- [ ] 11.4 Create System controller for internal APIs
  - Implement POST /api/automations/trigger (trigger event - internal only)
  - Implement GET /api/automations/available-triggers (list trigger types)
  - Implement GET /api/automations/available-actions (list action types)
  - _Requirements: 2.5_

- [ ] 11.5 Create Admin controller
  - Implement GET /api/admin/automations/stats (statistics)
  - Implement GET /api/admin/automations/performance (performance metrics)
  - _Requirements: 10.3, 10.4_

- [ ] 12. Checkpoint - Ensure all API tests pass
  - Ensure all tests pass, ask the user if questions arise.


- [ ] 13. Frontend - Services
- [ ] 13.1 Create automation frontend service
  - Implement getAllAutomations() - GET /api/automations
  - Implement getAutomation(id) - GET /api/automations/:id
  - Implement createAutomation(data) - POST /api/automations
  - Implement updateAutomation(id, data) - PUT /api/automations/:id
  - Implement deleteAutomation(id) - DELETE /api/automations/:id
  - Implement activateAutomation(id) - POST /api/automations/:id/activate
  - Implement deactivateAutomation(id) - POST /api/automations/:id/deactivate
  - Implement testAutomation(id, testData) - POST /api/automations/:id/test
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 13.1_

- [ ] 13.2 Create execution log frontend service
  - Implement getExecutionLogs(workflowId, filters) - GET /api/automations/:id/logs
  - Implement getAllExecutionLogs(filters) - GET /api/automations/logs
  - _Requirements: 5.3_

- [ ] 13.3 Create template frontend service
  - Implement getTemplates(filters) - GET /api/automations/templates
  - Implement getTemplate(id) - GET /api/automations/templates/:id
  - Implement createTemplate(data) - POST /api/automations/templates
  - Implement applyTemplate(id, customizations) - POST /api/automations/templates/:id/apply
  - _Requirements: 6.1, 6.2, 6.5_

- [ ] 13.4 Create trigger and action metadata service
  - Implement getAvailableTriggers() - GET /api/automations/available-triggers
  - Implement getAvailableActions() - GET /api/automations/available-actions
  - _Requirements: 12.2, 12.4_

- [ ] 14. Frontend - Reusable Components
- [ ] 14.1 Create TriggerSelector component
  - Display list of available trigger types
  - Show trigger configuration form based on selected type
  - Support temporal trigger configuration (time, frequency)
  - _Requirements: 12.2, 15.1, 15.2, 15.3_

- [ ] 14.2 Create ConditionBuilder component
  - Display condition list with add/remove buttons
  - Show field selector, operator selector, value input for each condition
  - Support AND/OR logic selection
  - Show condition preview
  - _Requirements: 12.3, 3.2, 3.3_

- [ ] 14.3 Create ActionSelector component
  - Display action list with add/remove/reorder buttons
  - Show action type selector
  - Show action configuration form based on type
  - Support template variable insertion for notifications
  - _Requirements: 12.4, 14.4_

- [ ] 14.4 Create AutomationPreview component
  - Display visual representation of workflow
  - Show trigger → conditions → actions flow
  - Highlight active/inactive status
  - _Requirements: 12.5_

- [ ] 14.5 Create ExecutionTimeline component
  - Display execution logs in timeline format
  - Show trigger event details
  - Show conditions evaluation result
  - Show actions executed with status
  - Show execution duration
  - Support filtering by date range and status
  - _Requirements: 5.4_


- [ ] 15. Frontend - Pages for Vendors/Admins
- [ ] 15.1 Create Automations list page (/dashboard/automacoes)
  - Display table of automations with name, trigger type, status, actions
  - Add filters for active/inactive, trigger type
  - Add search by name
  - Add actions: activate/deactivate, edit, delete, view logs
  - Show statistics cards (total, active, executions today)
  - Add "New Automation" button
  - _Requirements: 1.1, 1.4, 1.5, 11.2, 11.3_

- [ ] 15.2 Create Automation editor page (/dashboard/automacoes/nova and /editar/:id)
  - Step 1: Trigger selection using TriggerSelector component
  - Step 2: Conditions configuration using ConditionBuilder component
  - Step 3: Actions configuration using ActionSelector component
  - Show AutomationPreview component
  - Add "Test Workflow" button
  - Add "Save" and "Save & Activate" buttons
  - Handle loading, error, and success states
  - _Requirements: 1.1, 1.2, 12.1, 12.2, 12.3, 12.4, 12.5, 13.1_

- [ ] 15.3 Create Execution logs page (/dashboard/automacoes/:id/logs)
  - Display ExecutionTimeline component
  - Show filters for date range and status
  - Show execution details modal on click
  - Add export logs button
  - _Requirements: 5.3, 5.4, 5.5_

- [ ] 16. Frontend - Pages for Admins Only
- [ ] 16.1 Create Admin automations dashboard (/admin/automacoes)
  - Show metrics cards (total workflows, active, executions, success rate)
  - Show execution chart (executions per day)
  - Show top automations table (most used)
  - Show performance metrics (avg execution time, queue depth)
  - Show recent failures list
  - _Requirements: 10.3, 10.4_

- [ ] 16.2 Create Templates gallery page (/admin/automacoes/templates)
  - Display template cards with name, description, category
  - Add filters by category
  - Add "Create Template" button
  - Add "Apply Template" button on each card
  - Show template preview modal
  - _Requirements: 6.1, 6.2, 6.3_

- [ ] 17. Frontend - Routes and Navigation
- [ ] 17.1 Add automation routes to App.tsx
  - Add /dashboard/automacoes route (list)
  - Add /dashboard/automacoes/nova route (create)
  - Add /dashboard/automacoes/:id/editar route (edit)
  - Add /dashboard/automacoes/:id/logs route (logs)
  - Add /admin/automacoes route (admin dashboard)
  - Add /admin/automacoes/templates route (templates)
  - Protect routes with ProtectedRoute component
  - _Requirements: 11.2, 11.3_

- [ ] 17.2 Add navigation menu items
  - Add "Automações" menu item to DashboardLayout sidebar
  - Add "Automações" submenu to admin section
  - Add icon for automations (Zap or Workflow icon)
  - _Requirements: 12.1_

- [ ] 18. Integration Testing
- [ ] 18.1 Write integration test for complete workflow execution
  - Test end-to-end: create workflow → trigger event → verify actions executed
  - _Requirements: 2.5, 3.1, 4.1_

- [ ] 18.2 Write integration test for CRM integration
  - Test workflow with CRM actions (apply tag, create note, create appointment)
  - _Requirements: 7.1, 7.2, 7.3_

- [ ] 18.3 Write integration test for temporal triggers
  - Test daily, weekly, monthly trigger execution
  - _Requirements: 15.1, 15.2, 15.3_

- [ ] 19. Final Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 20. Documentation and Deployment
- [ ] 20.1 Update API documentation
  - Document all automation endpoints
  - Add request/response examples
  - Document error codes
  - _Requirements: All_

- [ ] 20.2 Create user guide
  - Document how to create workflows
  - Document available triggers and actions
  - Provide workflow examples
  - _Requirements: 12.1, 12.2, 12.3, 12.4_

- [ ] 20.3 Set up monitoring and alerts
  - Configure metrics tracking
  - Set up alerts for high failure rate
  - Set up alerts for queue depth
  - _Requirements: 10.3, 10.4_

- [ ] 20.4 Deploy to production
  - Run database migrations
  - Deploy backend services
  - Deploy frontend changes
  - Verify all systems operational
  - _Requirements: All_
