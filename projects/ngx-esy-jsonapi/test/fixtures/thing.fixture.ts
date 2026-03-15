export function getSampleThing(thingId = 'thing_1',
                               thingCategoryId = 'thing_category_1',
                               thingName = 'Thing One') {
  return {
    data: [
      {
        id: `${thingId}`,
        type: 'thing',
        attributes: {
          name: `${thingName}`
        },
        relationships: {
          categories: {
            data: [
              {
                id: `${thingCategoryId}`,
                type: 'thing_category'
              }
            ]
          }
        }
      }
    ],
    included: [
      {
        id: `${thingCategoryId}`,
        type: 'thing_category',
        relationships: {
          members: {
            data: [
              {
                id: `${thingId}`,
                type: 'thing'
              }
            ]
          }
        }
      },
    ]
  };
}
