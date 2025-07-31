/**
 * HTTP API Filter Backend (Example Implementation)
 * 
 * This implementation communicates with a real backend HTTP API.
 * This is an example of how easy it is to swap backends.
 * 
 * To use this instead of console logging, simply change the backend
 * initialization in filter_connector.ts from:
 * const backend = new ConsoleFilterBackend()
 * to:
 * const backend = new HttpFilterBackend('http://your-api-url')
 */

import { FilterBackend, type Filter, type FilterBanks, type BackendCapabilities } from './filter_backend_interface'

export class HttpFilterBackend extends FilterBackend {
  public readonly name = 'HTTP API Filter Backend'
  public readonly description = `
    <p><strong>HTTP API Filter Backend</strong></p>
    
    <p>This backend communicates with a real audio processing server via HTTP REST API calls.</p>
    
    <h4>Features:</h4>
    <ul>
      <li><strong>Real Backend Integration:</strong> Connects to actual audio processing hardware/software</li>
      <li><strong>RESTful API:</strong> Uses standard HTTP methods (GET, POST, PUT, DELETE)</li>
      <li><strong>Persistent Storage:</strong> Filter configurations are saved on the server</li>
      <li><strong>Dynamic Capabilities:</strong> Filter bank limits and availability determined by server</li>
    </ul>
    
    <h4>API Endpoints:</h4>
    <ul>
      <li><code>GET /capabilities</code> - Get backend information and limits</li>
      <li><code>POST /filter-banks/{name}/filters</code> - Add filter</li>
      <li><code>PUT /filter-banks/{name}/filters/{position}</code> - Update filter</li>
      <li><code>DELETE /filter-banks/{name}/filters/{position}</code> - Remove filter</li>
    </ul>
    
    <p><em>This backend requires a compatible audio processing server to be running and accessible.</em></p>
  `.trim()
  private apiBaseUrl: string

  constructor(apiBaseUrl: string) {
    super()
    this.apiBaseUrl = apiBaseUrl
  }

  private async apiCall(endpoint: string, method: string = 'GET', data?: unknown): Promise<unknown> {
    const url = `${this.apiBaseUrl}${endpoint}`
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    }

    if (data && method !== 'GET') {
      options.body = JSON.stringify(data)
    }

    const response = await fetch(url, options)
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    return await response.json()
  }

  async getBackendCapabilities(): Promise<BackendCapabilities> {
    const result = await this.apiCall('/capabilities') as BackendCapabilities
    console.log(`[${this.name}] Retrieved backend capabilities:`, result)
    return result
  }

  async addFilter(bankName: string, position: number, filter: Omit<Filter, 'id'>): Promise<string> {
    const result = await this.apiCall(`/filter-banks/${bankName}/filters`, 'POST', {
      position,
      filter
    }) as { id: string }
    
    console.log(`[HTTP Filter Backend] Added filter to ${bankName}:`, result)
    return result.id
  }

  async removeFilter(bankName: string, position: number): Promise<boolean> {
    try {
      await this.apiCall(`/filter-banks/${bankName}/filters/${position}`, 'DELETE')
      console.log(`[HTTP Filter Backend] Removed filter from ${bankName} at position ${position}`)
      return true
    } catch (error) {
      console.error(`[HTTP Filter Backend] Failed to remove filter:`, error)
      return false
    }
  }

  async updateFilter(bankName: string, position: number, updates: Partial<Omit<Filter, 'id'>>): Promise<boolean> {
    try {
      await this.apiCall(`/filter-banks/${bankName}/filters/${position}`, 'PATCH', updates)
      console.log(`[HTTP Filter Backend] Updated filter in ${bankName} at position ${position}:`, updates)
      return true
    } catch (error) {
      console.error(`[HTTP Filter Backend] Failed to update filter:`, error)
      return false
    }
  }

  async clearFiltersFromBank(bankName: string): Promise<void> {
    await this.apiCall(`/filter-banks/${bankName}/filters`, 'DELETE')
    console.log(`[HTTP Filter Backend] Cleared all filters from ${bankName}`)
  }

  async createFilterBank(bankName: string): Promise<void> {
    await this.apiCall(`/filter-banks/${bankName}`, 'POST')
    console.log(`[HTTP Filter Backend] Created filter bank: ${bankName}`)
  }

  async removeFilterBank(bankName: string): Promise<boolean> {
    try {
      await this.apiCall(`/filter-banks/${bankName}`, 'DELETE')
      console.log(`[HTTP Filter Backend] Removed filter bank: ${bankName}`)
      return true
    } catch (error) {
      console.error(`[HTTP Filter Backend] Failed to remove filter bank:`, error)
      return false
    }
  }

  async exportFilterConfig(): Promise<FilterBanks> {
    const config = await this.apiCall('/filter-banks/export') as FilterBanks
    console.log(`[HTTP Filter Backend] Exported filter configuration`)
    return config
  }

  async importFilterConfig(config: FilterBanks): Promise<void> {
    await this.apiCall('/filter-banks/import', 'POST', config)
    console.log(`[HTTP Filter Backend] Imported filter configuration`)
  }

  async getCurrentConfig(): Promise<FilterBanks> {
    return await this.apiCall('/filter-banks') as FilterBanks
  }
}

// Example usage:
// const backend = new HttpFilterBackend('http://localhost:8080/api/v1')
// 
// This would make HTTP calls like:
// POST http://localhost:8080/api/v1/filter-banks/left/filters
// GET http://localhost:8080/api/v1/filter-banks
// PATCH http://localhost:8080/api/v1/filter-banks/left/filters/0
// DELETE http://localhost:8080/api/v1/filter-banks/right/filters/1
// etc.
