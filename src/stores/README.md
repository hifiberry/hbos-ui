# Filter Store Architecture

This filter store implementation uses a pluggable backend architecture that allows easy switching between different implementations (console logging for demo, HTTP API for production, etc.).

## Current Files

### Core Architecture
- `filter_backend_interface.ts` - Abstract base class and interfaces
- `filter_connector.ts` - Main Pinia store that delegates to backends

### Backend Implementations
- `console_filter_backend.ts` - Console logging implementation (currently active)
- `http_filter_backend.ts` - Example HTTP API implementation

### Integration
- `speaker-equalizer.vue` - UI component that uses the filter store

## How It Works

The filter store uses a **Strategy Pattern** where:

1. **Filter Store** (`filter_connector.ts`) - Main interface used by components
2. **Backend Interface** (`filter_backend_interface.ts`) - Contract that all backends must implement
3. **Backend Implementations** - Specific implementations (console, HTTP, WebSocket, etc.)

## Current Setup (Console Logging)

Currently using `ConsoleFilterBackend` which logs all filter operations to the browser console:

```typescript
// In filter_connector.ts
const backend = new ConsoleFilterBackend()
```

All filter operations (add, remove, update, etc.) will show detailed logs like:
```
[Console Filter Backend] Added filter: {bankName: "left", position: 0, filter: {...}}
[Console Filter Backend] Updated filter: {bankName: "right", position: 1, updates: {...}}
[Console Filter Backend] Removed filter: {bankName: "left", position: 0, ...}
```

## Switching to HTTP Backend

To switch to a real HTTP API backend:

1. **Change the backend in `filter_connector.ts`:**
```typescript
// Replace this line:
const backend = new ConsoleFilterBackend()

// With this:
import { HttpFilterBackend } from './http_filter_backend'
const backend = new HttpFilterBackend('http://your-api-url/api/v1')
```

2. **No other changes needed!** The UI components continue to work exactly the same.

## HTTP API Endpoints

The HTTP backend expects these REST endpoints:

```
GET    /filter-banks                     - Get all filter banks
POST   /filter-banks/{name}              - Create filter bank
DELETE /filter-banks/{name}              - Remove filter bank

GET    /filter-banks/{name}/filters      - Get filters in bank
POST   /filter-banks/{name}/filters      - Add filter to bank
PATCH  /filter-banks/{name}/filters/{pos} - Update filter at position
DELETE /filter-banks/{name}/filters/{pos} - Remove filter at position
DELETE /filter-banks/{name}/filters      - Clear all filters in bank

POST   /filter-banks/import              - Import full configuration
GET    /filter-banks/export              - Export full configuration
```

## Creating New Backends

To create a new backend implementation:

1. **Extend the base class:**
```typescript
import { FilterBackend, type Filter, type FilterBanks } from './filter_backend_interface'

export class MyCustomBackend extends FilterBackend {
  async addFilter(bankName: string, position: number, filter: Omit<Filter, 'id'>): Promise<string> {
    // Your implementation here
    // Return the new filter ID
  }
  
  // Implement all other abstract methods...
}
```

2. **Use your backend:**
```typescript
// In filter_connector.ts
const backend = new MyCustomBackend(/* your params */)
```

## Examples of Other Backends

- **WebSocket Backend** - Real-time synchronization with server
- **Local Storage Backend** - Persist filters in browser
- **File System Backend** - Save/load from local files
- **Mock Backend** - Predefined responses for testing

## Benefits

✅ **Easy to switch** - Change one line to switch backends  
✅ **No UI changes** - Components work with any backend  
✅ **Easy testing** - Use mock backends for unit tests  
✅ **Consistent interface** - All backends follow the same contract  
✅ **Type safety** - Full TypeScript support  
✅ **Console logging** - Perfect for development and demos
