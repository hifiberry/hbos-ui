import type { Component } from 'vue'

export interface SandboxRoute {
  path: string,
  name: string,
  component: Component,
}
