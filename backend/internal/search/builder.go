package search

import (
    "fmt"
    "strings"
    "gorm.io/gorm"
)

// QueryBuilder helps construct GORM queries from SearchRequest
type QueryBuilder struct {
    db             *gorm.DB
    timestampField string
}

// NewQueryBuilder creates a new QueryBuilder
func NewQueryBuilder(db *gorm.DB, timestampField string) *QueryBuilder {
    return &QueryBuilder{db: db, timestampField: timestampField}
}

// Build constructs a GORM query from a SearchRequest
func (qb *QueryBuilder) Build(req *SearchRequest, orgID uint) *gorm.DB {
    query := qb.db.Where("org_id = ?", orgID)
    // Apply time range
    query = qb.applyTimeRange(query, req.TimeRange)
    // Apply filters
    query = qb.applyFilters(query, req.Filters)
    // Apply tag filters
    query = qb.applyTagFilters(query, req.Tags)
    // Apply sorting
    query = qb.applySorting(query, req.Sort)
    return query
}

// BuildWithCount returns both the query and a count query
func (qb *QueryBuilder) BuildWithCount(req *SearchRequest, orgID uint) (*gorm.DB, *gorm.DB) {
    baseQuery := qb.db.Where("org_id = ?", orgID)
    baseQuery = qb.applyTimeRange(baseQuery, req.TimeRange)
    baseQuery = qb.applyFilters(baseQuery, req.Filters)
    baseQuery = qb.applyTagFilters(baseQuery, req.Tags)
    // Use Session to create independent query copies
    countQuery := baseQuery.Session(&gorm.Session{})
    resultQuery := qb.applySorting(baseQuery.Session(&gorm.Session{}), req.Sort)
    return resultQuery, countQuery
}

// BuildWithCountNoOrg returns both the query and count query without org_id filter.
// Use this when org ownership is already verified through a parent entity.
func (qb *QueryBuilder) BuildWithCountNoOrg(req *SearchRequest) (*gorm.DB, *gorm.DB) {
    baseQuery := qb.db
    baseQuery = qb.applyTimeRange(baseQuery, req.TimeRange)
    baseQuery = qb.applyFilters(baseQuery, req.Filters)
    baseQuery = qb.applyTagFilters(baseQuery, req.Tags)
    // Use Session to create independent query copies
    countQuery := baseQuery.Session(&gorm.Session{})
    resultQuery := qb.applySorting(baseQuery.Session(&gorm.Session{}), req.Sort)
    return resultQuery, countQuery
}

func (qb *QueryBuilder) applyTimeRange(query *gorm.DB, tr *TimeRange) *gorm.DB {
    if tr == nil {
        return query
    }
    field := sanitizeFieldName(qb.timestampField)
    if field == "" {
        return query
    }
    if tr.From != nil {
        query = query.Where(fmt.Sprintf("%s >= ?", field), tr.From)
    }
    if tr.To != nil {
        query = query.Where(fmt.Sprintf("%s <= ?", field), tr.To)
    }
    return query
}

func (qb *QueryBuilder) applyFilters(query *gorm.DB, filters []FilterCondition) *gorm.DB {
    for _, f := range filters {
        query = applyFilterCondition(query, f)
    }
    return query
}

// normalizeOperator converts operator aliases to their canonical form
func normalizeOperator(op string) string {
    if canonical, ok := OperatorAliases[op]; ok {
        return canonical
    }
    return op
}

// sanitizeFieldName ensures field names only contain safe characters
// This is a defense-in-depth measure; fields should already be validated
func sanitizeFieldName(field string) string {
    var safe strings.Builder
    for _, c := range field {
        if (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9') || c == '_' {
            safe.WriteRune(c)
        }
    }
    return safe.String()
}

func applyFilterCondition(query *gorm.DB, f FilterCondition) *gorm.DB {
    field := sanitizeFieldName(f.Field)
    if field == "" {
        return query
    }
    op := normalizeOperator(f.Op)
    switch op {
    case "=":
        return query.Where(fmt.Sprintf("%s = ?", field), f.Value)
    case "!=":
        return query.Where(fmt.Sprintf("%s != ?", field), f.Value)
    case ">":
        return query.Where(fmt.Sprintf("%s > ?", field), f.Value)
    case "<":
        return query.Where(fmt.Sprintf("%s < ?", field), f.Value)
    case ">=":
        return query.Where(fmt.Sprintf("%s >= ?", field), f.Value)
    case "<=":
        return query.Where(fmt.Sprintf("%s <= ?", field), f.Value)
    case "in":
        return query.Where(fmt.Sprintf("%s IN ?", field), f.Value)
    case "contains":
        return query.Where(fmt.Sprintf("%s ILIKE ?", field), fmt.Sprintf("%%%v%%", f.Value))
    case "prefix":
        return query.Where(fmt.Sprintf("%s ILIKE ?", field), fmt.Sprintf("%v%%", f.Value))
    default:
        return query
    }
}

func (qb *QueryBuilder) applyTagFilters(query *gorm.DB, tags []TagFilter) *gorm.DB {
    for _, t := range tags {
        query = applyTagFilter(query, t)
    }
    return query
}

func applyTagFilter(query *gorm.DB, t TagFilter) *gorm.DB {
    // Tag key is passed as a parameterized value, so it's safe from SQL injection
    // The ->> operator extracts the value at the given key as text
    if t.Key == "" {
        return query
    }
    op := normalizeOperator(t.Op)
    switch op {
    case "=":
        return query.Where("tags ->> ? = ?", t.Key, t.Value)
    case "!=":
        return query.Where("(tags ->> ? IS NULL OR tags ->> ? != ?)", t.Key, t.Key, t.Value)
    case "contains":
        return query.Where("tags ->> ? ILIKE ?", t.Key, fmt.Sprintf("%%%s%%", t.Value))
    case "prefix":
        return query.Where("tags ->> ? ILIKE ?", t.Key, fmt.Sprintf("%s%%", t.Value))
    default:
        return query.Where("tags ->> ? = ?", t.Key, t.Value)
    }
}

func (qb *QueryBuilder) applySorting(query *gorm.DB, sorts []SortField) *gorm.DB {
    for _, s := range sorts {
        field := sanitizeFieldName(s.Field)
        if field == "" {
            continue
        }
        dir := strings.ToUpper(s.Dir)
        if dir != "ASC" && dir != "DESC" {
            dir = "DESC"
        }
        query = query.Order(fmt.Sprintf("%s %s", field, dir))
    }
    return query
}
