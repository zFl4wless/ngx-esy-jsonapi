export function HasMany(config: any = {}) {
  return (target: any, propertyName: string | symbol) => {
    const annotations: Array<{ propertyName: string | symbol; relationship: string | symbol }> =
      (Reflect.getMetadata('HasMany', target) as Array<{ propertyName: string | symbol; relationship: string | symbol }>) || [];

    annotations.push({
      propertyName,
      relationship: config.key || propertyName
    });

    Reflect.defineMetadata('HasMany', annotations, target);
  };
}
