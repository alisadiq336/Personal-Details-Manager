import re
import sys


def validate_schema(filename):
    try:
        with open(filename, "r", encoding="utf-8") as f:
            sql = f.read()

        errors = []

        # Safety check: no DROP TABLE statements
        if re.search(r"\bDROP\s+TABLE\b", sql, re.IGNORECASE):
            errors.append("ERROR: DROP TABLE statements are not allowed.")

        # Find CREATE TABLE definitions
        table_defs = re.findall(
            r"CREATE\s+TABLE\s+([a-zA-Z0-9_]+)\s*\((.*?)\);",
            sql,
            re.IGNORECASE | re.DOTALL,
        )

        for table_name, body in table_defs:

            # Snake case check
            if not re.match(r"^[a-z][a-z0-9_]*$", table_name):
                errors.append(
                    f"ERROR: Table '{table_name}' must be snake_case."
                )

            # Primary key check
            if not re.search(
                r"\bid\b.*PRIMARY\s+KEY",
                body,
                re.IGNORECASE,
            ):
                errors.append(
                    f"ERROR: Table '{table_name}' is missing a primary key named 'id'."
                )

        if errors:
            for err in errors:
                print(err)
            sys.exit(1)
        else:
            print("Schema validation passed.")
            sys.exit(0)

    except FileNotFoundError:
        print(f"Error: File '{filename}' not found.")
        sys.exit(1)


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python validate_schema.py <schema_file>")
        sys.exit(1)

    validate_schema(sys.argv[1])