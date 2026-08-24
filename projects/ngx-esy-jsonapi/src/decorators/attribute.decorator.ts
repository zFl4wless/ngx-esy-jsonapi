import { AttributeMetadata } from '../constants/symbols';
import { AttributeDecoratorOptions } from '../interfaces/attribute-decorator-options.interface';
import { DateConverter } from '../converters/date/date.converter';
import { cloneDeep, isEqual } from 'lodash-es';

export function Attribute(options: AttributeDecoratorOptions = {}): PropertyDecorator {
  return (target: any, propertyKey: string | symbol) => {
    if (typeof propertyKey !== 'string') {
      throw new TypeError('Attribute only supports string property names.');
    }
    const propertyName = propertyKey;
    const converter = (dataType: any, value: any, forSerialisation = false): any => {
      let attrConverter;

      if (options.converter) {
        attrConverter = options.converter;
      } else if (dataType === Date) {
        attrConverter = new DateConverter();
      } else {
        const datatype = new dataType();
        if (datatype.mask && datatype.unmask) {
          attrConverter = datatype;
        }
      }

      if (attrConverter) {
        return !forSerialisation ? attrConverter.mask(value) : attrConverter.unmask(value);
      }

      return value;
    };

    const saveAnnotations = () => {
      const metadata = Reflect.getMetadata('Attribute', target) || {};
      metadata[propertyName] = { marked: true };
      Reflect.defineMetadata('Attribute', metadata, target);

      const mappingMetadata = Reflect.getMetadata('AttributeMapping', target) || {};
      const serializedPropertyName = options.serializedName ?? propertyName;
      mappingMetadata[serializedPropertyName] = propertyName;
      Reflect.defineMetadata('AttributeMapping', mappingMetadata, target);
    };

    saveAnnotations();

    const getter = function(this: any) {
      return this[`_${propertyName}`];
    };

    const setter = function(this: any, newVal: any) {
      const targetType = Reflect.getMetadata('design:type', target, propertyName);
      const convertedValue = converter(targetType, newVal);

      this[`_${propertyName}`] = convertedValue;

      if (!this[AttributeMetadata]) {
        this[AttributeMetadata] = {};
      }

      if (this[AttributeMetadata][propertyName] && !this.isModelInitialization()) {
        this[AttributeMetadata][propertyName].newValue = convertedValue;
        this[AttributeMetadata][propertyName].hasDirtyAttributes = !isEqual(
          this[AttributeMetadata][propertyName].oldValue,
          convertedValue
        );
        this[AttributeMetadata][propertyName].serialisationValue = converter(targetType, convertedValue, true);
      } else {
        const isInitialization = this.isModelInitialization();
        const shouldMarkDirty = !isInitialization || this.id === undefined || this.id === null;
        const oldValue = shouldMarkDirty ? undefined : cloneDeep(convertedValue);
        this[AttributeMetadata][propertyName] = {
          newValue: convertedValue,
          oldValue,
          nested: false,
          serializedName: options.serializedName,
          hasDirtyAttributes: shouldMarkDirty,
          serialisationValue: converter(targetType, convertedValue, true),
        };
      }
    };

    if (delete target[propertyName]) {
      Object.defineProperty(target, propertyName, {
        get: getter,
        set: setter,
        enumerable: true,
        configurable: true,
      });
    }
  };
}
