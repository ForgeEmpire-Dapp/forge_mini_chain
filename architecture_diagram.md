
```mermaid
graph TD
    subgraph "User Interface"
        Frontend["📱 Frontend (App / Website)"]
    end

    subgraph "Backend Infrastructure"
        APIGateway["🌐 API Gateway / Middleware"]
    end

    subgraph "Data & Trust Layers"
        MiniBlockchain["🔗 Mini Blockchain <br/> (Hashes, Reputation, Tokens, Governance)"]
        Database["🗄️ Off-Chain DB <br/> (Profiles, Feeds, Follows)"]
        MediaStorage["🖼️ Off-Chain Media Storage <br/> (IPFS / S3 / CDN)"]
    end

    subgraph "Governance"
        MiniDAO["🏛️ Mini DAO <br/> (Community Moderation)"]
    end

    Frontend -->|User Actions (Post, Like, etc.)| APIGateway

    APIGateway -->|1. Save Hash & Update State| MiniBlockchain
    APIGateway -->|2. Store Full Content| Database
    APIGateway -->|3. Store Media Files| MediaStorage

    Database -->|Cache/Index Blockchain Data| APIGateway
    MiniBlockchain -.->|Stake Tokens for Voting| MiniDAO
```
