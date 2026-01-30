import { mockProducts } from '~/data/mock-products';

interface SuggestedRoute {
  title: string;
  uri: string;
}

interface RouteDescription {
  suggestedRoutes: SuggestedRoute[];
  itemTitle: string;
}

export function getRouteDescription(): RouteDescription {
  return {
    suggestedRoutes: mockProducts.slice(0, 6).map((product) => ({
      title: product.name,
      uri: `/products/${product.slug}`,
    })),
    itemTitle: 'Product',
  };
}
