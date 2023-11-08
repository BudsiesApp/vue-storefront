import { entities } from 'config'
import { Category, ChildrenData } from '../types/Category'

export function getIdFromSlug(slug?: string): number | undefined {
  if (!slug) {
    return;
  }

  const parts = slug.split('-');

  if (parts.length <= 1) {
    return;
  }

  const rawId = parts[parts.length - 1];

  const id = Number.parseInt(rawId);

  if (Number.isNaN(id)) {
    return;
  }

  return id;
}

export const compareByLabel = (a, b) => {
  if (a.label < b.label) {
    return -1
  }
  if (a.label > b.label) {
    return 1
  }
  return 0
}

export const _prepareCategoryPathIds = (category: Category): string[] => {
  if (!category || !category.path) return []
  return category.path.split('/')
}

export const getSearchOptionsFromRouteParams = (params: { [key: string]: string } = {}): Record<string, string> => {
  const filterableKeys = entities.category.validSearchOptionsFromRouteParams
  let filters: { [key: string]: string } = {}

  Object.keys(params)
    .filter(key => filterableKeys.includes(key))
    .forEach(key => { filters[key] = params[key] })

  return filters
}
