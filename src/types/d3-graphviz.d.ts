// Type declarations for d3-graphviz
declare module 'd3-graphviz' {
  export interface GraphvizRenderer {
    fit(enabled: boolean): GraphvizRenderer
    width(width: number): GraphvizRenderer
    height(height: number): GraphvizRenderer
    zoom(enabled: boolean): GraphvizRenderer
    transition(transition: () => unknown): GraphvizRenderer
    renderDot(dotString: string): GraphvizRenderer
  }

  export function graphviz(element: HTMLElement): GraphvizRenderer
}
