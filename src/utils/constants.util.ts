export enum ResponseMessageEnum {
  FILTERED_FIELDS = "Filtered Fields",
  MISSING_DATABASE_KEYS = "The following keys were not found in the database",
}

export enum CrudOperationsEnum {
  COUNT = "count",
  CREATE = "create",
  GETALL = "getAll",
  UPDATE = "update",
  DELETE = "delete",
  EXISTS = "exists",
  FIND_MANY = "findMany",
  SOFT_DELETE = "softDelete",
  FIND_SINGLE = "findSingle",
  BULK_CREATE = "bulkCreate",
  FIND_OR_CREATE = "findOrCreate",
  FIND_MANY_OR_CREATE_MANY = "findManyOrCreateMany",
  SYNC_INDEXES = "syncIndexes",
  DROP_INDEXES = "dropIndexes",
  SEARCH = "search",
}

export enum ConstantEnums {
  NULL = "nil",
}
