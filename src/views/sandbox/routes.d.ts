import type {Component} from "vue";

export interface SandboxRoute {
  path: string;
  name: string;
  component: () => Promise<Component>;
}

declare const routes: SandboxRoute[];
export default routes;
