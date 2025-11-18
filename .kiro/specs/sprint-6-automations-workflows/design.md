# Design Document: Automation and Workflow System

## Overview

The Automation and Workflow System enables business process automation through event-driven workflows. The system consists of a workflow engine that processes triggers, evaluates conditions, and executes actions. It integrates with existing CRM, Sales, and Affiliates systems to provide comprehensive automation capabilities.

### Key Components

- **Workflow Engine**: Core service that orchestrates workflow execution
- **Event Emitter**: Service that broadcasts business events to trigger workflows
- **Condition Evaluator**: Service that evaluates logical conditions against event data
- **Action Executor**: Service that executes configured actions
- **Queue Manager**: Service that manages asynchronous workflow execution
- **Template Manager**: Service that manages workflow templates

## Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend Layer                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Workflow     │  │ Execution    │  │ Template     │      │
│  │ Editor       │  │ Logs         │  │ Gallery      │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      API Layer                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Automation   │  │ Execution    │  │ Template     │      │
│  │ Controller   │  │ Controller   │  │ Controller   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   Business Logic Layer                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Workflow     │  │ Condition    │  │ Action       │      │
│  │ Engine       │  │ Evaluator    │  │ Executor     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Event        │  │ Queue        │  │ Template     │      │
│  │ Emitter      │  │ Manager      │  │ Manager      │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   Integration Layer                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ CRM          │  │ Sales        │  │ Affiliates   │      │
│  │ System       │  │ System       │  │ System       │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Data Layer                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ automations  │  │ automation_  │  │ automation_  │      │
│  │              │  │ logs         │  │ templates    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

### Workflow Execution Flow

```
1. Event Occurs (e.g., customer created)
   │
   ▼
2. Event Emitter broadcasts event
   │
   ▼
3. Workflow Engine receives event
   │
   ▼
4. Engine queries active workflows matching trigger type
   │
   ▼
5. For each matching workflow:
   │
   ├─▶ Queue workflow execution
   │
   ├─▶ Condition Evaluator evaluates conditions
   │   │
   │   ├─▶ If conditions met: continue
   │   └─▶ If conditions not met: skip actions, log result
   │
   ├─▶ Action Executor executes actions sequentially
   │   │
   │   ├─▶ Execute action 1
   │   ├─▶ Execute action 2
   │   └─▶ Execute action N
   │
   └─▶ Log execution result
```

## Components and Interfaces

### Workflow Engine Service

**Responsibility**: Orchestrate workflow execution from trigger to completion

**Interface**:
```typescript
interface IWorkflowEngine {
  // Process a trigger event
  processTrigger(event: TriggerEvent): Promise<void>;
  
  // Execute a specific workflow
  executeWorkflow(workflowId: string, triggerData: any): Promise<ExecutionResult>;
  
  // Test a workflow without persisting changes
  testWorkflow(workflow: Workflow, testData: any): Promise<TestResult>;
  
  // Schedule temporal workflows
  scheduleTemporalWorkflows(): Promise<void>;
}
```

**Key Methods**:
- `processTrigger`: Receives trigger events, finds matching workflows, queues executions
- `executeWorkflow`: Executes a single workflow including condition evaluation and action execution
- `testWorkflow`: Executes workflow in test mode without side effects
- `scheduleTemporalWorkflows`: Sets up cron jobs for temporal triggers

### Event Emitter Service

**Responsibility**: Broadcast business events to trigger workflows

**Interface**:
```typescript
interface IEventEmitter {
  // Emit an event
  emit(eventType: string, eventData: any): Promise<void>;
  
  // Subscribe to events
  on(eventType: string, handler: EventHandler): void;
  
  // Unsubscribe from events
  off(eventType: string, handler: EventHandler): void;
}
```

**Event Types**:
- `customer.created`, `customer.updated`, `customer.deleted`
- `order.created`, `order.paid`, `order.cancelled`, `order.delivered`
- `conversation.created`, `conversation.resolved`, `message.received`
- `appointment.created`, `appointment.completed`, `appointment.missed`
- `commission.calculated`, `commission.paid`
- `tag.applied`, `tag.removed`

### Condition Evaluator Service

**Responsibility**: Evaluate logical conditions against trigger event data

**Interface**:
```typescript
interface IConditionEvaluator {
  // Evaluate all conditions for a workflow
  evaluate(conditions: Condition[], eventData: any, context: EvaluationContext): Promise<boolean>;
  
  // Evaluate a single condition
  evaluateCondition(condition: Condition, eventData: any, context: EvaluationContext): Promise<boolean>;
}
```

**Supported Operators**:
- Comparison: `>`, `<`, `>=`, `<=`, `==`, `!=`
- String: `contains`, `not_contains`, `starts_with`, `ends_with`
- Array: `in`, `not_in`
- Logical: `AND`, `OR`, `NOT`

### Action Executor Service

**Responsibility**: Execute configured actions

**Interface**:
```typescript
interface IActionExecutor {
  // Execute all actions for a workflow
  executeActions(actions: Action[], eventData: any, context: ExecutionContext): Promise<ActionResult[]>;
  
  // Execute a single action
  executeAction(action: Action, eventData: any, context: ExecutionContext): Promise<ActionResult>;
  
  // Retry a failed action
  retryAction(action: Action, eventData: any, context: ExecutionContext, attempt: number): Promise<ActionResult>;
}
```

**Action Types**:
- **Notification**: `send_email`, `send_notification`, `send_whatsapp`, `send_sms`
- **CRM**: `apply_tag`, `remove_tag`, `create_note`, `update_customer`
- **Workflow**: `create_appointment`, `assign_conversation`, `create_task`
- **System**: `webhook`, `delay`, `stop_workflow`

### Queue Manager Service

**Responsibility**: Manage asynchronous workflow execution queue

**Interface**:
```typescript
interface IQueueManager {
  // Add workflow execution to queue
  enqueue(workflowId: string, triggerData: any, priority: number): Promise<void>;
  
  // Process next item in queue
  processNext(): Promise<void>;
  
  // Get queue status
  getStatus(): Promise<QueueStatus>;
}
```

**Queue Implementation**: Bull (Redis-based queue)
- Supports priority queuing
- Automatic retry with exponential backoff
- Job progress tracking
- Failed job handling

### Template Manager Service

**Responsibility**: Manage workflow templates

**Interface**:
```typescript
interface ITemplateManager {
  // Get all templates
  getTemplates(filters: TemplateFilters): Promise<Template[]>;
  
  // Get template by ID
  getTemplate(id: string): Promise<Template>;
  
  // Create template from workflow
  createTemplate(workflow: Workflow, metadata: TemplateMetadata): Promise<Template>;
  
  // Apply template to create workflow
  applyTemplate(templateId: string, customizations: any): Promise<Workflow>;
}
```

## Data Models

### Automations Table

```sql
CREATE TABLE automations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  active BOOLEAN DEFAULT false,
  trigger_type VARCHAR(100) NOT NULL,
  trigger_config JSONB NOT NULL DEFAULT '{}',
  conditions JSONB NOT NULL DEFAULT '[]',
  actions JSONB NOT NULL DEFAULT '[]',
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL
);

CREATE INDEX idx_automations_active ON automations(active) WHERE deleted_at IS NULL;
CREATE INDEX idx_automations_trigger_type ON automations(trigger_type) WHERE active = true AND deleted_at IS NULL;
CREATE INDEX idx_automations_created_by ON automations(created_by) WHERE deleted_at IS NULL;
```

### Automation Logs Table

```sql
CREATE TABLE automation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id UUID NOT NULL REFERENCES automations(id),
  trigger_event JSONB NOT NULL,
  conditions_met BOOLEAN NOT NULL,
  conditions_result JSONB,
  actions_executed JSONB NOT NULL DEFAULT '[]',
  status VARCHAR(50) NOT NULL, -- 'success', 'failed', 'partial'
  error_message TEXT,
  execution_duration_ms INTEGER,
  executed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_automation_logs_automation ON automation_logs(automation_id, executed_at DESC);
CREATE INDEX idx_automation_logs_status ON automation_logs(status, executed_at DESC);
CREATE INDEX idx_automation_logs_executed_at ON automation_logs(executed_at DESC);
```

### Automation Templates Table

```sql
CREATE TABLE automation_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100), -- 'welcome', 'reengagement', 'sales', 'support'
  trigger_type VARCHAR(100) NOT NULL,
  trigger_config JSONB NOT NULL DEFAULT '{}',
  conditions JSONB NOT NULL DEFAULT '[]',
  actions JSONB NOT NULL DEFAULT '[]',
  is_public BOOLEAN DEFAULT false,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_automation_templates_category ON automation_templates(category) WHERE is_public = true;
CREATE INDEX idx_automation_templates_public ON automation_templates(is_public);
```

### TypeScript Interfaces

```typescript
interface Workflow {
  id: string;
  name: string;
  description: string;
  active: boolean;
  trigger: {
    type: TriggerType;
    config: Record<string, any>;
  };
  conditions: Condition[];
  actions: Action[];
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

interface Condition {
  field: string; // e.g., 'customer.ltv', 'order.total', 'tags'
  operator: ConditionOperator;
  value: any;
  logic?: 'AND' | 'OR'; // How to combine with next condition
}

interface Action {
  type: ActionType;
  config: Record<string, any>;
  order: number; // Execution order
}

interface ExecutionLog {
  id: string;
  automation_id: string;
  trigger_event: any;
  conditions_met: boolean;
  conditions_result: any;
  actions_executed: ActionResult[];
  status: 'success' | 'failed' | 'partial';
  error_message?: string;
  execution_duration_ms: number;
  executed_at: Date;
}

interface ActionResult {
  action_type: string;
  status: 'success' | 'failed';
  error?: string;
  executed_at: Date;
  duration_ms: number;
}

type TriggerType = 
  | 'customer.created' | 'customer.updated' | 'customer.deleted'
  | 'order.created' | 'order.paid' | 'order.cancelled'
  | 'conversation.created' | 'message.received'
  | 'appointment.created' | 'appointment.missed'
  | 'temporal.daily' | 'temporal.weekly' | 'temporal.monthly'
  | 'tag.applied' | 'tag.removed';

type ConditionOperator = 
  | '>' | '<' | '>=' | '<=' | '==' | '!='
  | 'contains' | 'not_contains'
  | 'in' | 'not_in'
  | 'starts_with' | 'ends_with';

type ActionType =
  | 'send_email' | 'send_notification' | 'send_whatsapp'
  | 'apply_tag' | 'remove_tag' | 'create_note'
  | 'create_appointment' | 'assign_conversation'
  | 'webhook' | 'delay';
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Workflow Storage Completeness

*For any* workflow creation request with valid data, the stored workflow should contain all required fields (name, description, trigger, conditions, actions).

**Validates: Requirements 1.1**

### Property 2: Workflow Update Persistence

*For any* workflow and valid update data, after updating the workflow, retrieving it should return the updated values.

**Validates: Requirements 1.2**

### Property 3: Soft Delete Prevents Execution

*For any* deleted workflow, when a matching trigger event occurs, the workflow should not execute.

**Validates: Requirements 1.3**

### Property 4: Activation Enables Execution

*For any* inactive workflow, after activation, when a matching trigger event occurs, the workflow should execute.

**Validates: Requirements 1.4**

### Property 5: Deactivation Preserves Configuration

*For any* active workflow, after deactivation, the workflow configuration should remain unchanged but execution should not occur.

**Validates: Requirements 1.5**

### Property 6: Event Emission Completeness

*For any* business event (customer created, order paid, etc.), the Event Emitter should broadcast an event with complete event data.

**Validates: Requirements 2.1, 2.2, 2.3**

### Property 7: Workflow Matching Accuracy

*For any* trigger event, only workflows with matching trigger type and active status should be queued for execution.

**Validates: Requirements 2.5**

### Property 8: Condition Evaluation Before Actions

*For any* workflow with conditions, conditions should be evaluated before any actions execute.

**Validates: Requirements 3.1**

### Property 9: AND Logic Correctness

*For any* workflow with AND logic conditions, actions should execute only when all conditions evaluate to true.

**Validates: Requirements 3.2**

### Property 10: OR Logic Correctness

*For any* workflow with OR logic conditions, actions should execute when at least one condition evaluates to true.

**Validates: Requirements 3.3**

### Property 11: Numeric Operator Correctness

*For any* numeric condition with operators (>, <, ==, !=), the condition should evaluate correctly according to the operator semantics.

**Validates: Requirements 3.4**

### Property 12: Array Operator Correctness

*For any* array condition with contains/not_contains operators, the condition should evaluate correctly based on array membership.

**Validates: Requirements 3.5**

### Property 13: Action Execution Order

*For any* workflow with multiple actions, actions should execute in the order defined by their order field.

**Validates: Requirements 4.1**

### Property 14: Action Service Integration

*For any* action (email, tag, appointment), the appropriate service should be called with correct parameters.

**Validates: Requirements 4.2, 4.3, 4.4**

### Property 15: Error Isolation

*For any* workflow where one action fails, remaining actions should still execute and the error should be logged.

**Validates: Requirements 4.5**

### Property 16: Execution Logging Completeness

*For any* workflow execution, a log record should be created with trigger event, conditions result, actions executed, and timestamp.

**Validates: Requirements 5.1, 5.2**

### Property 17: Log Filtering Accuracy

*For any* log query with filters (workflow, date range, status), only logs matching all filters should be returned.

**Validates: Requirements 5.3**

### Property 18: Template Application Creates Workflow

*For any* template, applying the template should create a new workflow with the template's trigger, conditions, and actions configuration.

**Validates: Requirements 6.2**

### Property 19: Template Visibility Control

*For any* template, if marked private, only the creator should see it; if public, all users should see it.

**Validates: Requirements 6.4**

### Property 20: CRM Integration Correctness

*For any* CRM action (apply tag, create note, create appointment), the CRM service should be called with correct parameters.

**Validates: Requirements 7.1, 7.2, 7.3**

### Property 21: Sales Event Emission

*For any* sales event (order created, payment confirmed), the Sales System should emit the event with complete order data.

**Validates: Requirements 8.1, 8.2**

### Property 22: Affiliates Event Emission

*For any* commission calculation, the Affiliates System should emit a commission.calculated event with complete commission data.

**Validates: Requirements 9.1**

### Property 23: Async Queue Processing

*For any* set of simultaneous trigger events, all matching workflows should be queued and processed asynchronously.

**Validates: Requirements 10.1**

### Property 24: Retry Logic

*For any* failed action, the system should retry up to 3 times with exponential backoff before marking as failed.

**Validates: Requirements 10.2**

### Property 25: Loop Detection

*For any* workflow that triggers itself, the system should detect the loop and prevent execution after 3 iterations.

**Validates: Requirements 10.5**

### Property 26: Ownership Association

*For any* workflow created by a user, the workflow should be associated with that user's ID.

**Validates: Requirements 11.1**

### Property 27: Access Control Filtering

*For any* non-admin user listing workflows, only workflows created by that user should be returned.

**Validates: Requirements 11.2**

### Property 28: Admin Full Access

*For any* admin user listing workflows, all workflows in the system should be returned.

**Validates: Requirements 11.3**

### Property 29: Test Execution Isolation

*For any* workflow test execution, no data should be persisted to production tables.

**Validates: Requirements 13.1**

### Property 30: Template Variable Replacement

*For any* notification action with template variables, all variables should be replaced with actual data from the trigger event.

**Validates: Requirements 14.4**

### Property 31: Temporal Execution Frequency

*For any* temporal workflow (daily, weekly, monthly), the workflow should execute at the configured frequency and time.

**Validates: Requirements 15.1, 15.2, 15.3**

## Error Handling

### Error Categories

1. **Validation Errors**: Invalid workflow configuration, missing required fields
2. **Execution Errors**: Action execution failures, service unavailability
3. **System Errors**: Queue failures, database errors, timeout errors

### Error Handling Strategy

**Validation Errors**:
- Return 400 Bad Request with detailed error messages
- Do not create/update workflow
- Log validation failure

**Execution Errors**:
- Retry action up to 3 times with exponential backoff (1s, 2s, 4s)
- If all retries fail, mark action as failed
- Continue executing remaining actions
- Log error with stack trace

**System Errors**:
- Return 500 Internal Server Error
- Log error with full context
- Alert system administrators
- Implement circuit breaker for external services

### Retry Configuration

```typescript
interface RetryConfig {
  maxAttempts: 3;
  backoffMultiplier: 2;
  initialDelay: 1000; // ms
  maxDelay: 30000; // ms
}
```

### Circuit Breaker

Implement circuit breaker for external service calls (CRM, Sales, Affiliates):
- Open circuit after 5 consecutive failures
- Half-open after 30 seconds
- Close circuit after 3 consecutive successes

## Testing Strategy

### Unit Testing

**Framework**: Vitest

**Test Coverage**:
- Workflow Engine: trigger processing, workflow execution, test mode
- Condition Evaluator: all operators, logic combinations
- Action Executor: all action types, retry logic, error handling
- Event Emitter: event broadcasting, subscription management
- Queue Manager: enqueue, dequeue, priority handling

**Example Unit Test**:
```typescript
describe('ConditionEvaluator', () => {
  it('should evaluate AND logic correctly', async () => {
    const conditions = [
      { field: 'order.total', operator: '>', value: 1000, logic: 'AND' },
      { field: 'customer.tags', operator: 'contains', value: 'VIP' }
    ];
    const eventData = {
      order: { total: 1500 },
      customer: { tags: ['VIP', 'Premium'] }
    };
    
    const result = await evaluator.evaluate(conditions, eventData, {});
    expect(result).toBe(true);
  });
});
```

### Property-Based Testing

**Framework**: fast-check (JavaScript property-based testing library)

**Configuration**: Each property test should run minimum 100 iterations

**Test Tagging**: Each property test must include a comment with format:
```typescript
// Feature: automations-workflows, Property 1: Workflow Storage Completeness
```

**Property Tests**:

1. **Property 1: Workflow Storage Completeness**
```typescript
// Feature: automations-workflows, Property 1: Workflow Storage Completeness
it('should store all workflow fields', async () => {
  await fc.assert(
    fc.asyncProperty(
      workflowArbitrary(),
      async (workflow) => {
        const created = await workflowService.create(workflow);
        expect(created).toHaveProperty('name', workflow.name);
        expect(created).toHaveProperty('trigger');
        expect(created).toHaveProperty('conditions');
        expect(created).toHaveProperty('actions');
      }
    ),
    { numRuns: 100 }
  );
});
```

2. **Property 9: AND Logic Correctness**
```typescript
// Feature: automations-workflows, Property 9: AND Logic Correctness
it('should execute actions only when all AND conditions are true', async () => {
  await fc.assert(
    fc.asyncProperty(
      andConditionsArbitrary(),
      eventDataArbitrary(),
      async (conditions, eventData) => {
        const allTrue = conditions.every(c => evaluateCondition(c, eventData));
        const result = await evaluator.evaluate(conditions, eventData, {});
        expect(result).toBe(allTrue);
      }
    ),
    { numRuns: 100 }
  );
});
```

3. **Property 13: Action Execution Order**
```typescript
// Feature: automations-workflows, Property 13: Action Execution Order
it('should execute actions in defined order', async () => {
  await fc.assert(
    fc.asyncProperty(
      actionsArrayArbitrary(),
      async (actions) => {
        const executionOrder: number[] = [];
        const results = await executor.executeActions(actions, {}, {
          onActionExecute: (action) => executionOrder.push(action.order)
        });
        
        const expectedOrder = actions.map(a => a.order).sort((a, b) => a - b);
        expect(executionOrder).toEqual(expectedOrder);
      }
    ),
    { numRuns: 100 }
  );
});
```

### Integration Testing

**Test Scenarios**:
- End-to-end workflow execution from trigger to action completion
- Integration with CRM, Sales, Affiliates systems
- Queue processing with multiple concurrent workflows
- Temporal trigger scheduling and execution
- Error handling and retry logic

**Example Integration Test**:
```typescript
describe('Workflow Execution Integration', () => {
  it('should execute complete workflow when customer is created', async () => {
    // Create workflow
    const workflow = await workflowService.create({
      name: 'Welcome New Customer',
      trigger: { type: 'customer.created', config: {} },
      conditions: [],
      actions: [
        { type: 'send_email', config: { template: 'welcome' }, order: 1 },
        { type: 'apply_tag', config: { tag: 'New Customer' }, order: 2 }
      ]
    });
    
    await workflowService.activate(workflow.id);
    
    // Trigger event
    const customer = await customerService.create({ name: 'Test Customer' });
    
    // Wait for async execution
    await waitFor(() => {
      const logs = await executionLogService.getByWorkflow(workflow.id);
      expect(logs).toHaveLength(1);
      expect(logs[0].status).toBe('success');
      expect(logs[0].actions_executed).toHaveLength(2);
    });
  });
});
```

### Performance Testing

**Metrics to Monitor**:
- Workflow execution time (target: < 5 seconds)
- Queue processing throughput (target: > 100 workflows/minute)
- Database query performance (target: < 100ms per query)
- Memory usage during high load

**Load Testing**:
- Simulate 1000 concurrent trigger events
- Verify all workflows execute successfully
- Verify no memory leaks
- Verify queue doesn't overflow

## Deployment Considerations

### Database Migrations

Execute migrations in order:
1. Create automations table
2. Create automation_logs table
3. Create automation_templates table
4. Create indexes
5. Create RLS policies

### Environment Variables

```bash
# Queue Configuration
REDIS_URL=redis://localhost:6379
QUEUE_CONCURRENCY=10

# Retry Configuration
ACTION_RETRY_MAX_ATTEMPTS=3
ACTION_RETRY_INITIAL_DELAY=1000

# Performance
WORKFLOW_EXECUTION_TIMEOUT=30000
RATE_LIMIT_PER_MINUTE=100

# Circuit Breaker
CIRCUIT_BREAKER_THRESHOLD=5
CIRCUIT_BREAKER_TIMEOUT=30000
```

### Monitoring

**Metrics to Track**:
- Total workflows created
- Active workflows count
- Executions per minute
- Success rate
- Average execution time
- Failed actions count
- Queue depth

**Alerts**:
- Execution failure rate > 10%
- Queue depth > 1000
- Average execution time > 10 seconds
- Circuit breaker open

### Scaling Considerations

**Horizontal Scaling**:
- Multiple worker processes can consume from the same queue
- Use Redis for distributed locking
- Ensure idempotent action execution

**Database Optimization**:
- Partition automation_logs table by date
- Archive old logs (> 90 days) to separate table
- Use connection pooling

**Caching**:
- Cache active workflows in Redis (TTL: 5 minutes)
- Cache template list (TTL: 1 hour)
- Invalidate cache on workflow update/delete
