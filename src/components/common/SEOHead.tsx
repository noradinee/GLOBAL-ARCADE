import React, { useEffect } from 'react';
import { updatePageSEO, SEOProps } from '../../utils/seo';

export const SEOHead: React.FC<SEOProps> = (props) => {
  useEffect(() => {
    updatePageSEO(props);
  }, [props.title, props.description, props.keywords, props.canonicalUrl, props.lang, props.schemaData, props.robots]);

  return null;
};
