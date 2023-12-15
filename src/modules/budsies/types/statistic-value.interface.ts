import { StatisticMetric } from './statistic-metric';

export interface StatisticValue {
  metric: StatisticMetric,
  value: string | number
}
