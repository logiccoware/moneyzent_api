erDiagram
    %% ============================================
    %% MONOVRA DATABASE - ENTITY RELATIONSHIP DIAGRAM
    %% ============================================

    %% AUTH SCHEMA
    user {
        uuid id PK
        string email
        string name
        string role
    }

    session {
        uuid id PK
        uuid user_id FK
        string token
        timestamp expires_at
        string ip_address
    }

    account {
        uuid id PK
        uuid user_id FK
        string provider_id
        string account_id
        string access_token
    }

    verification {
        uuid id PK
        string identifier
        string value
        timestamp expires_at
    }

    %% PUBLIC SCHEMA
    financial_account {
        uuid id PK
        uuid user_id FK
        string name
        enum currency_type "USD, CAD, INR"
    }

    payee {
        uuid id PK
        uuid user_id FK
        string name
    }

    category {
        uuid id PK
        uuid user_id FK
        uuid parent_id FK "nullable, self-reference"
        string name
        string full_name
    }

    tag {
        uuid id PK
        uuid user_id FK
        string name
        int usage_count
    }

    transaction {
        uuid id PK
        uuid user_id FK
        uuid financial_account_id FK
        uuid payee_id FK
        date date
        enum type "EXPENSE, INCOME"
        string memo
        decimal total_amount
        int split_count
        string account_name "denormalized"
        string currency_code "denormalized"
        string payee_name "denormalized"
        string category_name "denormalized"
    }

    transaction_split {
        uuid id PK
        uuid transaction_id FK
        uuid category_id FK
        decimal amount
        string memo
        string category_full_name "denormalized"
        int sort_order
    }

    line_item {
        uuid id PK
        uuid split_id FK
        string name
        decimal amount
        string memo
        int sort_order
    }

    line_item_tag {
        uuid line_item_id FK
        uuid tag_id FK
    }

    %% ============================================
    %% RELATIONSHIPS
    %% ============================================

    %% Auth Schema Relationships
    user ||--o{ session : "has"
    user ||--o{ account : "has"

    %% User owns all entities
    user ||--o{ financial_account : "owns"
    user ||--o{ payee : "owns"
    user ||--o{ category : "owns"
    user ||--o{ tag : "owns"
    user ||--o{ transaction : "owns"

    %% Category self-reference (hierarchy)
    category ||--o{ category : "parent of"

    %% Transaction relationships
    financial_account ||--o{ transaction : "contains"
    payee ||--o{ transaction : "paid to"
    transaction ||--|{ transaction_split : "has"
    category ||--o{ transaction_split : "categorizes"

    %% Line item relationships
    transaction_split ||--o{ line_item : "contains"
    line_item ||--o{ line_item_tag : "tagged with"
    tag ||--o{ line_item_tag : "applies to"