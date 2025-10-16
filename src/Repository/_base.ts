import { Model, UpdateQuery, FilterQuery, Schema, Document, PopulateOptions } from "mongoose";
import { ConstantEnums, CrudOperationsEnum, ResponseMessageEnum, PaginatedResponse } from "../utils"; // Assuming these are defined elsewhere

// --- Type Refinements ---

// Ensure 'I' extends Mongoose's Document for better type inference
abstract class BaseAbstract<T, I extends Document> {
    abstract create(payload: T, options?: { populate?: string[] }): Promise<I>; // Added options
    abstract getAll(queries: {
        page?: number;
        pageSize?: number;
        queries?: FilterQuery<I>; // Use FilterQuery for better type safety
        search?: string;
    }, options?: { populate?: string[] }): Promise<PaginatedResponse<I>>;
    abstract count(query?: FilterQuery<I>): Promise<number>; // Use FilterQuery
    abstract update(query: FilterQuery<I>, payload: UpdateQuery<I>): Promise<I | null>; // Use FilterQuery
    abstract delete(id: string): Promise<void>;
    abstract search(query: string): Promise<I[] | null>;
    abstract exists(query: FilterQuery<I>): Promise<boolean>; // Use FilterQuery
    abstract findSingle(payload: FilterQuery<I>, options?: { projection?: object; populate?: string[] }): Promise<I | null>; // Use FilterQuery
    abstract softDelete(id: string): Promise<void>;
    abstract syncIndexes(): Promise<void>;
    abstract dropIndexes(): Promise<void>;
    abstract findOrCreate(payload: Partial<I>, key: keyof I, options?: { populate?: string[] }): Promise<I>; // Added options
    abstract findMany(filter: { key: keyof I; values: any[] }, options?: { populate?: string[] }): Promise<I[]>; // Refined filter type
    abstract findManyOrCreateMany(identifiers: any[], key: keyof I, options?: { populate?: string[] }): Promise<I[]>; // Added options, refined identifiers type
    abstract bulkCreate(payload: T[]): Promise<I[]>; // Added bulkCreate to abstract
}

type MongoFilters<T> = FilterQuery<T> & {
    $text?: { $search: string };
};

type BaseServiceConstructorType<I extends Document> = { // I extends Document here too
    Model: Model<I>;
    serializer?: string[];
    allowedOperations?: CrudOperationsEnum[];
}

type ProjectionType = {
    [key: string]: 0 | 1 | { $meta: "textScore" };
};

const notAllowedMsg = (operation: CrudOperationsEnum): never => {
    const err = new Error(`Operation ${operation} not allowed`);
    console.error(err); // Use console.error for errors
    throw err;
};


export default class BaseService<T, I extends Document> extends BaseAbstract<T, I> { // I extends Document here
    private readonly Model: Model<I>;
    private readonly allowedOperations: CrudOperationsEnum[];
    protected readonly serializer: string[];

    public constructor(builder: BaseServiceConstructorType<I>) {
        super();
        this.Model = builder.Model;
        this.serializer = builder.serializer || [];
        this.allowedOperations = builder.allowedOperations || Object.values(CrudOperationsEnum);
    }

    public get NAME(): string {
        return this.Model.modelName;
    }

    // --- Helper for common projection logic ---
    private get _excludedFieldsProjection(): string {
        return this.serializer.map(field => `-${field}`).join(" ");
    }

    // --- Helper for population options ---
    private _getPopulateOptions(paths: string[]): PopulateOptions[] {
        const selectString = this._excludedFieldsProjection;
        return paths.map(path => ({ path, select: selectString }));
    }

    // --- Helper for common base query ---
    private _getBaseQuery(query: FilterQuery<I>): FilterQuery<I> {
        return { isDeleted: false, ...query };
    }

    async findSingle(payload: FilterQuery<I>, options?: { projection?: object; populate?: string[] }): Promise<I | null> {
        if (!this.allowedOperations.includes(CrudOperationsEnum.FIND_SINGLE)) {
            notAllowedMsg(CrudOperationsEnum.FIND_SINGLE);
        }
        console.log(ResponseMessageEnum.FILTERED_FIELDS, this.serializer);

        let query = this.Model.findOne(this._getBaseQuery(payload), options?.projection)
            .select(this._excludedFieldsProjection);

        if (options?.populate?.length) {
            query = query.populate(this._getPopulateOptions(options.populate));
        }

        return await query.exec();
    }

    async create(payload: T, options?: { populate?: string[] }): Promise<I> {
        if (!this.allowedOperations.includes(CrudOperationsEnum.CREATE)) {
            notAllowedMsg(CrudOperationsEnum.CREATE);
        }
        let create = await this.Model.create(payload); // Model.create returns the created document

        if (options?.populate?.length) {
            // Mongoose's populate method can be called directly on the Document
            create = await create.populate(this._getPopulateOptions(options.populate));
        }
        return create;
    }

    async getAll(queries: { page?: number; pageSize?: number; queries?: FilterQuery<I>; search?: string; }, options?: { populate?: string[] }): Promise<PaginatedResponse<I>> {
        if (!this.allowedOperations.includes(CrudOperationsEnum.GETALL)) {
            notAllowedMsg(CrudOperationsEnum.GETALL);
        }

        console.log(ResponseMessageEnum.FILTERED_FIELDS, this.serializer);
        const page = queries.page || 1;
        const pageSize = queries.pageSize || 5;
        const mongoFilters: MongoFilters<I> = { ...queries.queries };

        const skip = (page - 1) * pageSize;
        const baseQuery = this._getBaseQuery(mongoFilters);
        const total = await this.Model.countDocuments(baseQuery);

        const isTextSearch = Boolean(queries.search);
        if (isTextSearch && queries.search) {
            mongoFilters.$text = { $search: queries.search };
        }

        const projection: ProjectionType = {};
        this.serializer.forEach(field => {
            projection[field] = 0;
        });
        if (isTextSearch) {
            projection.score = { $meta: "textScore" };
        }

        const formattedQueries = {} as Record<string, MongoFilters<I | T> | string | any>; // Use 'any' as a fallback if types are complex
        for (const [key, value] of Object.entries(mongoFilters)) {
            const schemaPath = this.Model.schema.path(key);
            if (!schemaPath) {
                // If the field isn't in the schema, it might be a query operator or an invalid field.
                // You might want to log this or explicitly allow only schema fields.
                // For now, let's allow query operators like $text, $or, etc.
                if (!key.startsWith('$')) continue;
            }
            if (schemaPath) { // Only process if it's a schema path
                const isArrayField = schemaPath instanceof Schema.Types.Array || schemaPath.instance === 'Array';
                formattedQueries[key] = isArrayField ? { $in: Array.isArray(value) ? value : [value] } : value;
            } else { // Handle query operators that are not schema paths
                formattedQueries[key] = value;
            }
        }

        // Check if formatted queries value has a "nil" as string
        // Better to handle "nil" parsing at the API/controller level,
        // transforming it to `null` or `undefined` before it reaches service.
        // For now, adapting to current logic:
        if (Object.values(formattedQueries).some(val => val === ConstantEnums.NULL)) {
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

        let queryChain = this.Model.find(this._getBaseQuery(formattedQueries))
            .select(projection)
            .sort(
                isTextSearch
                    ? { score: { $meta: "textScore" } }
                    : { createdAt: "desc" }
            )
            .skip(skip)
            .limit(pageSize);

        if (options?.populate?.length) {
            queryChain = queryChain.populate(this._getPopulateOptions(options.populate));
        }

        const data = await queryChain.exec();

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

    async findMany(filter: { key: keyof I; values: any[] }, options?: { populate?: string[] }): Promise<I[]> {
        if (!this.allowedOperations.includes(CrudOperationsEnum.FIND_MANY)) {
            notAllowedMsg(CrudOperationsEnum.FIND_MANY);
        }

        console.log(ResponseMessageEnum.FILTERED_FIELDS, this.serializer);
        // Using `any[]` for values for flexibility, consider a more specific type if possible
        const mongoFilter = this._getBaseQuery({ [filter.key]: { $in: filter.values } } as FilterQuery<I>);

        let queryChain = this.Model.find(mongoFilter)
            .select(this._excludedFieldsProjection);

        if (options?.populate?.length) {
            queryChain = queryChain.populate(this._getPopulateOptions(options.populate));
        }

        const response = await queryChain.exec();

        const foundValues = new Set(response.map(doc => String(doc[filter.key])));
        const missing_keys = filter.values.filter(value => !foundValues.has(String(value)));

        if (missing_keys.length > 0) {
            throw new Error(`${ResponseMessageEnum.MISSING_DATABASE_KEYS}: ${missing_keys.join(", ")}`);
        }

        return response;
    }

    async findOrCreate(
        payload: Partial<I>,
        key: keyof I,
        options?: { populate?: string[] }): Promise<I> {
        if (!this.allowedOperations.includes(CrudOperationsEnum.FIND_OR_CREATE)) {
            notAllowedMsg(CrudOperationsEnum.FIND_OR_CREATE);
        }

        console.log(ResponseMessageEnum.FILTERED_FIELDS, this.serializer);
        const value = payload[key];
        const filter = this._getBaseQuery({ [key]: value } as FilterQuery<I>);

        // Optimization: Use findOneAndUpdate with upsert: true for atomicity
        let doc = await this.Model.findOneAndUpdate(
            filter,
            { $setOnInsert: payload }, // Only set these fields if a new document is inserted
            {
                upsert: true,     // Create if not found
                new: true,        // Return the new document
                setDefaultsOnInsert: true // Apply schema defaults on new document
            }
        )
            .select(this._excludedFieldsProjection);

        if (options?.populate?.length) {
            doc = await doc.populate(this._getPopulateOptions(options.populate));
        }

        return doc as I; // Cast needed because findOneAndUpdate might return null if not found (but upsert:true prevents this)
    }

    async findManyOrCreateMany(identifiers: any[], key: keyof I, options?: { populate?: string[] }) {
        if (!this.allowedOperations.includes(CrudOperationsEnum.FIND_MANY_OR_CREATE_MANY)) {
            notAllowedMsg(CrudOperationsEnum.FIND_MANY_OR_CREATE_MANY);
        }
        console.log(ResponseMessageEnum.FILTERED_FIELDS, this.serializer);

        const filter = this._getBaseQuery({ [key]: { $in: identifiers } } as FilterQuery<I>);
        let existingDocs = await this.Model.find(filter).select(this._excludedFieldsProjection).exec();
        const existingValues = new Set(existingDocs.map(doc => doc[key] as string));

        const toCreate = identifiers.filter(val => !existingValues.has(val));
        let createdDocs: I[] = [];
        if (toCreate.length > 0) {
            createdDocs = await this.Model.insertMany(
                toCreate.map(val => ({ [key]: val })), { ordered: false }
            ) as unknown as I[]; // insertMany returns an array of documents
        }


        if (options?.populate?.length) {
            existingDocs = await this.Model.populate(existingDocs, this._getPopulateOptions(options.populate));
            if (createdDocs.length > 0) {
                createdDocs = await this.Model.populate(createdDocs, this._getPopulateOptions(options.populate));
            }
        }

        return [...existingDocs, ...createdDocs];
    }

    async bulkCreate(payload: T[]): Promise<I[]> {
        if (!this.allowedOperations.includes(CrudOperationsEnum.BULK_CREATE)) {
            notAllowedMsg(CrudOperationsEnum.BULK_CREATE);
        }

        const docs = await this.Model.insertMany(payload);
        // insertMany returns Documents, no need for .toObject() if I extends Document
        return docs as unknown as I[];
    }

    async update(query: FilterQuery<I>, payload: UpdateQuery<I>): Promise<I | null> {
        if (!this.allowedOperations.includes(CrudOperationsEnum.UPDATE)) {
            notAllowedMsg(CrudOperationsEnum.UPDATE);
        }
        console.log(ResponseMessageEnum.FILTERED_FIELDS, this.serializer);
        const update = await this.Model.findOneAndUpdate(this._getBaseQuery(query), payload, {
            new: true,
        }).select(this._excludedFieldsProjection).exec();
        return update;
    }

    async delete(id: string): Promise<void> {
        if (!this.allowedOperations.includes(CrudOperationsEnum.DELETE)) {
            notAllowedMsg(CrudOperationsEnum.DELETE);
        }
        console.log(ResponseMessageEnum.FILTERED_FIELDS, this.serializer);

        await this.Model.findByIdAndDelete(id);
    }

    async softDelete(_id: string): Promise<void> {
        if (!this.allowedOperations.includes(CrudOperationsEnum.SOFT_DELETE)) {
            notAllowedMsg(CrudOperationsEnum.SOFT_DELETE);
        }
        // Use updateOne for efficiency, it returns an UpdateWriteOpResult, not the doc
        await this.Model.updateOne({ _id, isDeleted: false }, { isDeleted: true, deletedAt: new Date() });
    }

    async exists(query: FilterQuery<I>): Promise<boolean> {
        if (!this.allowedOperations.includes(CrudOperationsEnum.EXISTS)) {
            notAllowedMsg(CrudOperationsEnum.EXISTS);
        }
        const exists = await this.Model.exists(this._getBaseQuery(query));
        return !!exists;
    }

    async search(query: string): Promise<I[] | null> {
        if (!this.allowedOperations.includes(CrudOperationsEnum.SEARCH)) {
            notAllowedMsg(CrudOperationsEnum.SEARCH);
        }

        console.log(ResponseMessageEnum.FILTERED_FIELDS, this.serializer);

        const projection: ProjectionType = Object.fromEntries(this.serializer.map(field => [field, 0]));
        projection.score = { $meta: "textScore" };

        const results = await this.Model.find(this._getBaseQuery({
            $text: { $search: query }
        }))
            .select(projection)
            .sort({ score: { $meta: "textScore" } })
            .exec();

        return results.length ? results : null; // Return null if no results for consistency with previous `null` return type
    }

    async count(query?: FilterQuery<I>): Promise<number> {
        if (!this.allowedOperations.includes(CrudOperationsEnum.COUNT)) {
            notAllowedMsg(CrudOperationsEnum.COUNT);
        }
        const count = await this.Model.countDocuments(this._getBaseQuery(query || {})); // Handle optional query
        return count;
    }

    async syncIndexes(): Promise<void> {
        if (!this.allowedOperations.includes(CrudOperationsEnum.SYNC_INDEXES)) { // Added check
            notAllowedMsg(CrudOperationsEnum.SYNC_INDEXES);
        }
        await this.Model.syncIndexes();
        console.log(`Indexes synced for ${this.NAME}`); // More specific log
    }

    async dropIndexes(): Promise<void> {
        if (!this.allowedOperations.includes(CrudOperationsEnum.DROP_INDEXES)) { // Added check
            notAllowedMsg(CrudOperationsEnum.DROP_INDEXES);
        }
        // Ensure you don't drop _id index without care, Mongoose often recreates it.
        // This drops all user-defined indexes.
        await this.Model.collection.dropIndexes();
        console.log(`Indexes dropped for ${this.NAME}`); // More specific log
    }
}