import { CrudOperationsEnum } from "../utils";
import { BaseService } from "./_base";
import { RiotApi, IRiotApi } from "./Entities/RiotApi.entity";

export class RiotApiRepository extends BaseService<
  Partial<IRiotApi>,
  IRiotApi
> {
  constructor() {
    super({
      Model: RiotApi,
      allowedOperations: [
        CrudOperationsEnum.COUNT,
        CrudOperationsEnum.CREATE,
        CrudOperationsEnum.GETALL,
        CrudOperationsEnum.UPDATE,
        CrudOperationsEnum.EXISTS,
        CrudOperationsEnum.FIND_MANY,
        CrudOperationsEnum.FIND_SINGLE,
        CrudOperationsEnum.SOFT_DELETE,
      ],
      serializer: ["createdAt", "updatedAt", "deletedAt", "isDeleted", "__v"],
    });
  }
}
