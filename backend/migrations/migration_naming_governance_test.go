package migrations

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"testing"
)

var (
	governedMigrationNamePattern   = regexp.MustCompile(`^([0-9]{3})([a-z]?)_([a-z0-9]+(?:_[a-z0-9]+)*)\.sql$`)
	governedMigrationPrefixPattern = regexp.MustCompile(`^[0-9]{3}$`)
)

type migrationCollisionBaseline struct {
	Version           int                 `json:"version"`
	DuplicatePrefixes map[string][]string `json:"duplicate_prefixes"`
}

type governedMigrationName struct {
	filename string
	prefix   string
	suffix   string
}

func TestMigrationNamingGovernanceCurrentTree(t *testing.T) {
	baseline := loadMigrationCollisionBaseline(t, "migration_prefix_collisions.baseline.json")
	entries, err := os.ReadDir(".")
	if err != nil {
		t.Fatalf("read migrations directory: %v", err)
	}

	var filenames []string
	for _, entry := range entries {
		if !entry.IsDir() && filepath.Ext(entry.Name()) == ".sql" {
			filenames = append(filenames, entry.Name())
		}
	}

	if errors := validateMigrationNamingGovernance(filenames, baseline); len(errors) > 0 {
		t.Fatalf("migration naming governance failed:\n  - %s", strings.Join(errors, "\n  - "))
	}
}

func TestMigrationNamingGovernanceRejectsNewDuplicatePrefix(t *testing.T) {
	filenames := []string{
		"232_existing.sql",
		"233_first_change.sql",
		"233_second_change.sql",
	}

	errors := validateMigrationNamingGovernance(filenames, migrationCollisionBaseline{
		Version:           1,
		DuplicatePrefixes: map[string][]string{},
	})
	assertMigrationGovernanceErrorContains(t, errors, "new duplicate migration prefix 233")
}

func TestMigrationNamingGovernanceRejectsExtendingHistoricalCollision(t *testing.T) {
	filenames := []string{
		"006_first.sql",
		"006_second.sql",
		"006_third.sql",
	}
	baseline := migrationCollisionBaseline{
		Version: 1,
		DuplicatePrefixes: map[string][]string{
			"006": {"006_first.sql", "006_second.sql"},
		},
	}

	errors := validateMigrationNamingGovernance(filenames, baseline)
	assertMigrationGovernanceErrorContains(t, errors, "historical duplicate-prefix baseline 006 changed")
}

func TestMigrationNamingGovernanceRejectsNewLetterSuffix(t *testing.T) {
	filenames := []string{"233a_new_change.sql"}

	errors := validateMigrationNamingGovernance(filenames, migrationCollisionBaseline{
		Version:           1,
		DuplicatePrefixes: map[string][]string{},
	})
	assertMigrationGovernanceErrorContains(t, errors, "letter-suffixed migration filename")
}

func TestMigrationNamingGovernanceRejectsInvalidAndCaseCollidingNames(t *testing.T) {
	filenames := []string{
		"233_valid_name.sql",
		"234_Bad_Name.sql",
		"235_case_name.sql",
		"235_CASE_NAME.sql",
	}

	errors := validateMigrationNamingGovernance(filenames, migrationCollisionBaseline{
		Version:           1,
		DuplicatePrefixes: map[string][]string{},
	})
	assertMigrationGovernanceErrorContains(t, errors, "invalid migration filename")
	assertMigrationGovernanceErrorContains(t, errors, "case-insensitively")
}

func loadMigrationCollisionBaseline(t *testing.T, path string) migrationCollisionBaseline {
	t.Helper()
	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read migration collision baseline: %v", err)
	}
	var baseline migrationCollisionBaseline
	if err := json.Unmarshal(data, &baseline); err != nil {
		t.Fatalf("decode migration collision baseline: %v", err)
	}
	return baseline
}

func validateMigrationNamingGovernance(filenames []string, baseline migrationCollisionBaseline) []string {
	var errors []string
	if baseline.Version != 1 {
		errors = append(errors, fmt.Sprintf("baseline version must be 1, got %d", baseline.Version))
	}
	if baseline.DuplicatePrefixes == nil {
		errors = append(errors, "baseline duplicate_prefixes must not be null")
		baseline.DuplicatePrefixes = map[string][]string{}
	}

	seenExact := make(map[string]struct{}, len(filenames))
	seenFolded := make(map[string]string, len(filenames))
	migrations := make([]governedMigrationName, 0, len(filenames))
	for _, filename := range filenames {
		if _, exists := seenExact[filename]; exists {
			errors = append(errors, fmt.Sprintf("migration filename is not unique: %s", filename))
		}
		seenExact[filename] = struct{}{}

		folded := strings.ToLower(filename)
		if previous, exists := seenFolded[folded]; exists && previous != filename {
			errors = append(errors, fmt.Sprintf("migration filenames collide case-insensitively: %s and %s", previous, filename))
		}
		seenFolded[folded] = filename

		match := governedMigrationNamePattern.FindStringSubmatch(filename)
		if match == nil {
			errors = append(errors, fmt.Sprintf("invalid migration filename %q", filename))
			continue
		}
		if match[1] == "000" {
			errors = append(errors, fmt.Sprintf("migration filename %q uses reserved prefix 000", filename))
		}
		migrations = append(migrations, governedMigrationName{
			filename: filename,
			prefix:   match[1],
			suffix:   match[2],
		})
	}
	if len(migrations) == 0 {
		errors = append(errors, "no valid SQL migration files found")
		return errors
	}

	lexicalOrder := make([]string, 0, len(migrations))
	for _, migration := range migrations {
		lexicalOrder = append(lexicalOrder, migration.filename)
	}
	sort.Strings(lexicalOrder)

	semanticOrder := append([]governedMigrationName(nil), migrations...)
	sort.Slice(semanticOrder, func(i, j int) bool {
		left, right := semanticOrder[i], semanticOrder[j]
		leftPrefix, _ := strconv.Atoi(left.prefix)
		rightPrefix, _ := strconv.Atoi(right.prefix)
		if leftPrefix != rightPrefix {
			return leftPrefix < rightPrefix
		}
		leftSuffixRank := migrationSuffixRank(left.suffix)
		rightSuffixRank := migrationSuffixRank(right.suffix)
		if leftSuffixRank != rightSuffixRank {
			return leftSuffixRank < rightSuffixRank
		}
		return left.filename < right.filename
	})
	for index, migration := range semanticOrder {
		if lexicalOrder[index] != migration.filename {
			errors = append(errors, "migration filename ordering differs between bytewise and semantic sorting")
			break
		}
	}

	historicalFilenames := make(map[string]struct{})
	for _, filenames := range baseline.DuplicatePrefixes {
		for _, filename := range filenames {
			historicalFilenames[filename] = struct{}{}
		}
	}
	for _, migration := range migrations {
		if migration.suffix != "" {
			if _, historical := historicalFilenames[migration.filename]; !historical {
				errors = append(errors, fmt.Sprintf("letter-suffixed migration filename %s is not a historical baseline member", migration.filename))
			}
		}
	}

	groups := make(map[string][]string)
	for _, migration := range migrations {
		groups[migration.prefix] = append(groups[migration.prefix], migration.filename)
	}
	actualDuplicates := make(map[string][]string)
	for prefix, names := range groups {
		if len(names) > 1 {
			sort.Strings(names)
			actualDuplicates[prefix] = names
		}
	}

	allPrefixes := make(map[string]struct{}, len(actualDuplicates)+len(baseline.DuplicatePrefixes))
	for prefix := range actualDuplicates {
		allPrefixes[prefix] = struct{}{}
	}
	baselineFilenames := make(map[string]string)
	for prefix, expected := range baseline.DuplicatePrefixes {
		allPrefixes[prefix] = struct{}{}
		if !governedMigrationPrefixPattern.MatchString(prefix) {
			errors = append(errors, fmt.Sprintf("invalid baseline prefix %q", prefix))
		}
		if len(expected) < 2 {
			errors = append(errors, fmt.Sprintf("baseline prefix %s must contain at least two filenames", prefix))
		}
		if !sort.StringsAreSorted(expected) {
			errors = append(errors, fmt.Sprintf("baseline prefix %s filenames must be sorted", prefix))
		}
		for _, filename := range expected {
			match := governedMigrationNamePattern.FindStringSubmatch(filename)
			if match == nil {
				errors = append(errors, fmt.Sprintf("baseline contains invalid migration filename %q", filename))
				continue
			}
			if match[1] != prefix {
				errors = append(errors, fmt.Sprintf("baseline filename %s belongs to prefix %s, not %s", filename, match[1], prefix))
			}
			folded := strings.ToLower(filename)
			if previous, exists := baselineFilenames[folded]; exists {
				errors = append(errors, fmt.Sprintf("baseline filename is duplicated or case-colliding: %s and %s", previous, filename))
			}
			baselineFilenames[folded] = filename
		}
	}

	prefixes := make([]string, 0, len(allPrefixes))
	for prefix := range allPrefixes {
		prefixes = append(prefixes, prefix)
	}
	sort.Strings(prefixes)
	for _, prefix := range prefixes {
		actual, actualExists := actualDuplicates[prefix]
		expected, expectedExists := baseline.DuplicatePrefixes[prefix]
		switch {
		case !expectedExists:
			errors = append(errors, fmt.Sprintf("new duplicate migration prefix %s: %s", prefix, strings.Join(actual, ", ")))
		case !actualExists:
			errors = append(errors, fmt.Sprintf("historical duplicate-prefix baseline %s is no longer present", prefix))
		case !equalMigrationFilenameLists(actual, expected):
			errors = append(errors, fmt.Sprintf("historical duplicate-prefix baseline %s changed", prefix))
		}
	}

	return errors
}

func migrationSuffixRank(suffix string) int {
	if suffix == "" {
		return 0
	}
	return int(suffix[0]-'a') + 1
}

func equalMigrationFilenameLists(left, right []string) bool {
	if len(left) != len(right) {
		return false
	}
	for index := range left {
		if left[index] != right[index] {
			return false
		}
	}
	return true
}

func assertMigrationGovernanceErrorContains(t *testing.T, errors []string, want string) {
	t.Helper()
	for _, message := range errors {
		if strings.Contains(message, want) {
			return
		}
	}
	t.Fatalf("expected governance error containing %q, got: %v", want, errors)
}
