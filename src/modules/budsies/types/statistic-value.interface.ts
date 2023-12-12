import { StatisticValuesMetricValue } from 'src/modules/shared';

export interface StatisticValue {
  metric: StatisticValuesMetricValue,
  value: string | number
}
