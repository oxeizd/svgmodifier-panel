import  React from "react"
import  { SelectableValue } from "@grafana/data"
import { Button } from "@grafana/ui"
import { MetricCard } from "./metric-card"
import  { Metric } from "../types"
import { styles } from "./styles/metrics.styles"

interface MetricsTabProps {
  metrics: Metric[]
  onUpdateMetrics: (metrics: Metric[]) => void
  getQueryOptions: () => Array<SelectableValue<string>>
}

export const MetricsTab: React.FC<MetricsTabProps> = ({ metrics, onUpdateMetrics, getQueryOptions }) => {
  const addMetric = () => {
    const newMetric: Metric = {
      refIds: [],
      legends: [],
      baseColor: "green",
      decimal: 2,
    }
    onUpdateMetrics([...metrics, newMetric])
  }

  const updateMetric = (index: number, metric: Metric) => {
    const newMetrics = [...metrics]
    newMetrics[index] = metric
    onUpdateMetrics(newMetrics)
  }

  const removeMetric = (index: number) => {
    const newMetrics = metrics.filter((_, i) => i !== index)
    onUpdateMetrics(newMetrics)
  }

  return (
    <div>
      <div className={styles.sectionHeader}>
        <h6>Metrics Configuration</h6>
        <Button size="sm" onClick={addMetric}>
          Add Metric
        </Button>
      </div>

      {metrics.map((metric, index) => (
        <MetricCard
          key={index}
          metric={metric}
          index={index}
          onUpdate={(updatedMetric) => updateMetric(index, updatedMetric)}
          onRemove={() => removeMetric(index)}
          getQueryOptions={getQueryOptions}
        />
      ))}

      {metrics.length === 0 && (
        <div className={styles.emptyState}>
          <p>No metrics configured. Add a metric to get started.</p>
        </div>
      )}
    </div>
  )
}
