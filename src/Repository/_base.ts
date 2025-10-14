import { Model, UpdateQuery, FilterQuery, Schema, Document, PopulateOptions } from "mongoose";
import { ConstantEnums, CrudOperationsEnum, ResponseMessageEnum, PaginatedResponse } from "../utils";

abstract class BaseAbstract<T, I> {
    abstract create(payload: T): Promise<I>;
    abstract getAll(queries: {
        page: number;
        pageSize: number;
        queries: object;
        search?: string;
    }, options?: { populate?: string[] }): Promise<PaginatedResponse<I>>;
    abstract count(query: object): Promise<number>;
    abstract update(query: object, payload: UpdateQuery<I>): Promise<I | null>;
    abstract delete(id: string): Promise<void>;
    abstract search(query: string): Promise<I[] | null>;
    abstract exists(query: object): Promise<boolean>;
    abstract findSingle(payload: object, options?: { projection?: object }): Promise<I | null>;
    abstract softDelete(id: string): Promise<void>;
    abstract syncIndexes(): Promise<void>;
    abstract dropIndexes(): Promise<void>;
    abstract findOrCreate(payload: Partial<I>, key: keyof I): Promise<I>
    abstract findMany(filter: FilterQuery<I>): Promise<I[]>
    abstract findManyOrCreateMany(identifiers: string[], key: keyof I): Promise<I[]>;
}

// Create a type instead of an interface
type MongoFilters<T> = FilterQuery<T> & {
    $text?: { $search: string };
};

type BaseServiceConstructorType<I> = {
    // Model: Model<I, SanitizeQueryHelpers<I>>;
    Model: Model<I>;
    serializer?: string[];
    allowedOperations?: CrudOperationsEnum[];
}

/**
 * Type for the projection object used in Mongoose queries.
 * @typedef {Object} ProjectionType
 * @property {string} [key] - The key of the field to project.
 * @property {0|1|{ $meta: "textScore" }} [value] - The value of the field to project.
*/
type ProjectionType = {
    [key: string]: 0 | 1 | { $meta: "textScore" };
};

/**
 * Function to handle not allowed operations.
 * @param {CrudOperationsEnum} operation - The operation that is not allowed.
 * @returns {never} - Throws an error.
 */
const notAllowedMsg = (operation: CrudOperationsEnum): never => {
    const err = new Error(`Operation ${operation} not allowed`);
    console.log(err)
    throw err;
};


/**
 * BaseService class that provides CRUD operations for Mongoose models.
 * @template T - Type of the payload for create and update operations.
 * @template I - Type of the Mongoose model instance.
 */
export default class BaseService<T, I> extends BaseAbstract<T, I> {
    private readonly Model: Model<I>;
    private readonly allowedOperations: CrudOperationsEnum[];
    protected readonly serializer: string[];

    /**
     * Constructor for BaseService.
     * @param {BaseServiceConstructorType<I>} builder - Object containing the model and allowed operations.
     */
    public constructor(builder: BaseServiceConstructorType<I>) {
        super();
        this.Model = builder.Model;
        this.serializer = builder.serializer || [];
        this.allowedOperations = builder.allowedOperations || Object.values(CrudOperationsEnum);
    }

    /**
     * Getter for the model name.
     * @returns {string} - The name of the model.
     */
    public get NAME(): string {
        return this.Model.modelName;
    }

    /**
     * finds a single document in the database.
     * @param payload object
     * @param options {projection?: object}
     * @returns I | null
     */
    async findSingle(payload: object, options?: { projection?: object, populate?: string[] }): Promise<I | null> {
        if (!this.allowedOperations.includes(CrudOperationsEnum.FIND_SINGLE)) {
            notAllowedMsg(CrudOperationsEnum.FIND_SINGLE);
        }
        console.log(ResponseMessageEnum.FILTERED_FIELDS, this.serializer);
        const findSingle = await this.Model.findOne({ isDeleted: false, ...payload }, options?.projection).select(this.serializer.map(field => `-${field}`)).exec();

        if (findSingle !== null && options?.populate && options?.populate?.length > 0) {
            const doc = findSingle as Document<I>;
            const populateOptions: PopulateOptions[] = options.populate.map(path => ({ path, select: this.serializer.map(field => `-${field}`).join(" ") }));
            await doc.populate(populateOptions);
        }
        return findSingle as I | null;
    }

    /**
     * Creates a new document in the database.
     * @param {T} payload - The data to create the document with.
     * @returns {Promise<I>} - The created document.
     */
    async create(payload: T, options?: { populate?: string[] }): Promise<I> {
        if (!this.allowedOperations.includes(CrudOperationsEnum.CREATE)) {
            notAllowedMsg(CrudOperationsEnum.CREATE);
        }
        let create = new this.Model(payload);
        await create.save();

        if (options?.populate?.length) {
            create = await (create as Document).populate(
                options.populate.map(path => ({ path, select: this.serializer.map(field => `-${field}`).join(" ") }))
            );
        }
        return create as I;
    }

    /**
     * Retrieves all documents from the database with optional pagination and search.
     * @param {object} queries - The query parameters for pagination and search.
     * @returns {Promise<PaginatedResponse<I>>} - The paginated response containing the documents.
     */
    async getAll(queries: { page?: number; pageSize?: number; queries?: object; search?: string; }, options?: { populate?: string[] }): Promise<PaginatedResponse<I>> {
        if (!this.allowedOperations.includes(CrudOperationsEnum.GETALL)) {
            notAllowedMsg(CrudOperationsEnum.GETALL);
        }

        console.log(ResponseMessageEnum.FILTERED_FIELDS, this.serializer);
        const page = queries.page || 1;
        const pageSize = queries.pageSize || 5;
        const mongoFilters: MongoFilters<I> = { ...queries.queries };

        const skip = (page - 1) * pageSize;
        const total = await this.Model.countDocuments({ isDeleted: false, ...mongoFilters });

        // Only add text search if search query is provided and is not empty
        const isTextSearch = Boolean(queries.search);
        if (isTextSearch && queries.search) { // Add extra check for TypeScript
            mongoFilters.$text = { $search: queries.search };
        }

        // Build projection object for select()
        const projection: ProjectionType = {};
        this.serializer.forEach(field => {
            projection[field] = 0;
        });
        if (isTextSearch) {
            projection.score = { $meta: "textScore" };
        }

        // 
        const formattedQueries = {} as Record<string, MongoFilters<I | T> | string>;
        for (const [key, value] of Object.entries(mongoFilters)) {
            const schemaPath = this.Model.schema.path(key);
            if (!schemaPath) continue; // Skip if field is not in schema
            const isArrayField = schemaPath instanceof Schema.Types.Array || schemaPath.instance === 'Array';
            formattedQueries[key] = isArrayField ? { $in: Array.isArray(value) ? value : [value] } : value;
        }
        // check if formatted queries value has a "nil" as string
        if (Object.values(formattedQueries).includes(ConstantEnums.NULL)) {
            return {
                payload: [],
                meta: {
                    page,
                    total,
                    pageSize,
                    totalPages: Math.ceil(total / pageSize),
                },
            };
        }

        let data = await this.Model.find({ isDeleted: false, ...formattedQueries })
            .select(projection)
            .sort(
                isTextSearch
                    ? { score: { $meta: "textScore" } }
                    : { createdAt: "desc" }
            )
            .skip(skip)
            .limit(pageSize)
            .exec();


        // populate relative fields while serializing unwanted values
        if (options?.populate?.length) {
            data = await this.Model.populate(data, options.populate.map(path => ({ path, select: this.serializer.map(field => `-${field}`).join(" ") })));
        }

        return {
            payload: data,
            meta: {
                page,
                total,
                pageSize,
                totalPages: Math.ceil(total / pageSize),
            },
        };
    }

    /**
   * Retrieves all documents from the database without the pagination feature
   * await service.findMany({ status: 'active' });
   * await service.findMany([{ key: '_id', values: ['id1', 'id2', 'id3'] }]);
   * @param {FilterQuery<I>} filter - the paylooad you want toquery
   * @returns {Promise<I[]>} - return an array of response
   */
    async findMany(filter: { key: string; values: string[] }, options?: { populate?: string[] }): Promise<I[]> {
        if (!this.allowedOperations.includes(CrudOperationsEnum.FIND_MANY)) {
            notAllowedMsg(CrudOperationsEnum.FIND_MANY);
        }

        console.log(ResponseMessageEnum.FILTERED_FIELDS, this.serializer);
        const mongoFilter = { isDeleted: false, ...filter.values.length && { [filter.key]: { $in: filter.values } } };

        let response = await this.Model.find(mongoFilter)
            .select(this.serializer.map(field => `-${field}`)).exec()

        // Filter out missing ones
        const foundValues = response.map(doc => String(doc[filter.key as keyof I]));
        const missing_keys = filter.values.filter(value => !foundValues.includes(String(value)));
        console.log({ response, foundValues, missing_keys });

        if (missing_keys.length > 0) {
            throw new Error(`${ResponseMessageEnum.MISSING_DATABASE_KEYS}: ${missing_keys.join(", ")}`);
        }

        // populate relative fields while serializing unwanted values
        if (response.length && options?.populate?.length) {
            response = await this.Model.populate(response, options.populate.map(path => ({ path, select: this.serializer.map(field => `-${field}`).join(" ") })));
        }

        return response;
    }

    /**
  * Find Or Create 
  * @param {Partial<I>} payload an array of value you want to check
  * @param {keyof I} key the key you want to find
  * @returns {I} array of data of existing and created documents
  */
    async findOrCreate(
        payload: Partial<I>,
        key: keyof I,
        options?: { populate?: string[] }): Promise<I> {
        if (!this.allowedOperations.includes(CrudOperationsEnum.FIND_OR_CREATE)) {
            notAllowedMsg(CrudOperationsEnum.FIND_OR_CREATE);
        }

        console.log(ResponseMessageEnum.FILTERED_FIELDS, this.serializer);
        const value = payload[key];
        const filter = { [key]: value, isDeleted: false } as FilterQuery<T>;
        let doc = await this.Model.findOne(filter).select(this.serializer.map(field => `-${field}`)) ?? await this.Model.create(payload);

        if (options?.populate && options.populate.length > 0) {
            doc = await this.Model.populate(doc, options.populate.map(path => ({ path, select: this.serializer.map(field => `-${field}`).join(" ") })));
        }

        return doc
    }

    /**
     * Find Many Or Create Many
     * @param {string[]} identifiers an array of value you want to check
     * @param {keyof I} key the key you want to find
     * @returns {I[]} array of data of existing and created documents
     */
    async findManyOrCreateMany(identifiers: string[], key: keyof I, options?: { populate: string[] }) {
        if (!this.allowedOperations.includes(CrudOperationsEnum.FIND_MANY_OR_CREATE_MANY)) {
            notAllowedMsg(CrudOperationsEnum.FIND_MANY_OR_CREATE_MANY);
        }
        console.log(ResponseMessageEnum.FILTERED_FIELDS, this.serializer);

        const filter = { [key]: { $in: identifiers } } as FilterQuery<I>;
        let existingDocs = await this.Model.find({ isDeleted: false, ...filter }).select(this.serializer.map(field => `-${field}`)).exec();
        const existingValues = existingDocs.map(doc => doc[key] as string);

        const toCreate = identifiers.filter(val => !existingValues.includes(val));
        let createdDocs: I[] = await this.Model.insertMany(
            toCreate.map(val => ({ [key]: val })), { ordered: false }
        ) as I[];

        if (options && options.populate && options?.populate?.length > 0) {
            existingDocs = await this.Model.populate(existingDocs, options.populate.map(path => ({ path, select: this.serializer.map(field => `-${field}`).join(" ") })));
            createdDocs = await this.Model.populate(createdDocs, options.populate.map(path => ({ path, select: this.serializer.map(field => `-${field}`).join(" ") })));
        }

        return [...existingDocs, ...createdDocs] as I[];
    }

    /**
   * Create multiple payload at once
   * @param {T} payload - the payload you want to create
   * @returns { Promise<I[]>} - return an array of response
   */
    async bulkCreate(payload: T[]): Promise<I[]> {
        if (!this.allowedOperations.includes(CrudOperationsEnum.BULK_CREATE)) {
            notAllowedMsg(CrudOperationsEnum.BULK_CREATE);
        }

        const docs = await this.Model.insertMany(payload) as (I & Document)[];
        return docs.map(doc => doc.toObject() as I);
    }

    /**
     * Updates a document in the database.
     * @param {object} query - The query to find the document to update.
     * @param {UpdateQuery<I>} payload - The data to update the document with.
     * @returns {Promise<I | null>} - The updated document or null if not found.
     */
    // { $addToSet: { instructor: userId } },
    // { $pull: { instructor: { $in: [userId1, userId2] } } },
    async update(query: object, payload: UpdateQuery<I>): Promise<I | null> {
        if (!this.allowedOperations.includes(CrudOperationsEnum.UPDATE)) {
            notAllowedMsg(CrudOperationsEnum.UPDATE);
        }
        console.log(ResponseMessageEnum.FILTERED_FIELDS, this.serializer);
        const update = await this.Model.findOneAndUpdate({ isDeleted: false, ...query }, payload, {
            new: true,
        }).select(this.serializer.map(field => `-${field}`)).exec();
        return update as I | null;
    }

    /**
     * Deletes a document from the database.
     * @param {string} id - The ID of the document to delete.
     * @returns {Promise<void>} - A promise that resolves when the document is deleted.
     */
    async delete(id: string): Promise<void> {
        if (!this.allowedOperations.includes(CrudOperationsEnum.DELETE)) {
            notAllowedMsg(CrudOperationsEnum.DELETE);
        }
        console.log(ResponseMessageEnum.FILTERED_FIELDS, this.serializer);

        await this.Model.findByIdAndDelete(id);
    }

    /**
     * Soft deletes a document in the database.
     * @param {string} _id - The ID of the document to soft delete.
     * @returns {Promise<void>} - A promise that resolves when the document is soft deleted.
     */
    async softDelete(_id: string): Promise<void> {
        if (!this.allowedOperations.includes(CrudOperationsEnum.SOFT_DELETE)) {
            notAllowedMsg(CrudOperationsEnum.SOFT_DELETE);
        }
        await this.Model.updateOne({ _id }, { isDeleted: true, deletedAt: new Date() });
    }

    /**
     * Checks if a document exists in the database.
     * @param {object} query - The query to find the document.
     * @returns {Promise<boolean>} - True if the document exists, false otherwise.
     */
    async exists(query: object): Promise<boolean> {
        if (!this.allowedOperations.includes(CrudOperationsEnum.EXISTS)) {
            notAllowedMsg(CrudOperationsEnum.EXISTS);
        }
        const exists = await this.Model.exists({ isDeleted: false, ...query });
        return !!exists;
    }

    /**
     * Searches for documents in the database based on a query.
     * @param {string} query - The search query.
     * @returns {Promise<I[] | null>} - An array of matching documents or null if none found.
     */
    async search(query: string): Promise<I[] | null> {
        console.log(ResponseMessageEnum.FILTERED_FIELDS, this.serializer);
        await this.Model.syncIndexes()
        console.log(`indexes synced`);
        const results = await this.Model.find({
            isDeleted: false,
            $text: { $search: query }
        })
            .select({
                ...Object.fromEntries(this.serializer.map(field => [field, 0])),
                score: { $meta: "textScore" }
            })
            .sort({ score: { $meta: "textScore" } })
            .exec();

        return results;
    }

    /**
     * Counts the number of documents in the database.
     * @param {object} query - The query to count documents.
     * @returns {Promise<number>} - The count of documents.
     */
    async count(query?: object): Promise<number> {
        if (!this.allowedOperations.includes(CrudOperationsEnum.COUNT)) {
            notAllowedMsg(CrudOperationsEnum.COUNT);
        }
        const count = await this.Model.countDocuments({ isDeleted: false, ...query });
        return count;
    }

    /**
     * Syncs indexes for the model.
     * @returns {Promise<void>} - A promise that resolves when indexes are synced.
     */
    async syncIndexes(): Promise<void> {
        await this.Model.syncIndexes()
        console.log(`indexes synced`);
    }
    /**
     * Drops indexes for the model.
     * @returns {Promise<void>} - A promise that resolves when indexes are dropped.
     */
    async dropIndexes(): Promise<void> {
        await this.Model.collection.dropIndexes();
        console.log(`indexes dropped`);
    }

}
