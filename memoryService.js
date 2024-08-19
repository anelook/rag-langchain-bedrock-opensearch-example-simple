import dotenv from 'dotenv';
import {BedrockChat} from "@langchain/community/chat_models/bedrock";
import {BedrockEmbeddings} from "@langchain/aws";
import {Client} from '@opensearch-project/opensearch';
import {OpenSearchVectorStore} from "@langchain/community/vectorstores/opensearch";
import {VectorDBQAChain} from "langchain/chains";
import {Document} from "langchain/document";

dotenv.config();
export class MemoryService {
    constructor(indexName) {
        // specify LLM model
        const llmModel = new BedrockChat({
            model: "anthropic.claude-3-haiku-20240307-v1:0",
            region: "us-east-1",
            credentials: {
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
                accessKeyId: process.env.AWS_ACCESS_KEY_ID
            },
        });
        // specify embeddings model
        this.embeddingsModel = new BedrockEmbeddings({
            region: 'us-east-1',
            credentials: {
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
                accessKeyId: process.env.AWS_ACCESS_KEY_ID
            },
            model: "amazon.titan-embed-text-v1",
        });
        // create OpenSearch store
        this.openSearchStore = {
            client: new Client({
                nodes: [process.env.OPENSEARCH_SERVICE_URI],
            }),
            indexName,
        }
        // create vector store by combining OpenSearch store with the embeddings model
        this.vectorStore = new OpenSearchVectorStore(this.embeddingsModel, this.openSearchStore);
        // combine the LLM model and the vector store to get a chain
        this.chain = VectorDBQAChain.fromLLM(llmModel, this.vectorStore, {
            k: 1,
            returnSourceDocuments: true,
        });
    }
    async storeMemory(memory) {
        // Package a memory in a document
        const doc = new Document({
            pageContent: memory,
        });
        // Create vector representation for a document and index it in OpenSearch
        await OpenSearchVectorStore.fromDocuments([doc], this.embeddingsModel, this.openSearchStore);
    }

    async getGetRelevantMemory(query) {
        const response = await this.chain.call({query});
        return response.text;
    }
}