import { StatisticValuesMetric } from 'src/modules/shared';

export interface StatisticValue {
  metric: StatisticValuesMetric,
  value: string | number
}
