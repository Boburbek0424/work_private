/*
 * game_of_life.c
 *
 * Conway's Game of Life implemented in C following the principles of
 * structured programming:
 *
 *   - Top-down decomposition into small, single-purpose functions.
 *   - Control flow built only from sequence, selection (if) and
 *     iteration (for/while). No use of goto.
 *   - Each function has a single entry point and a single exit point.
 *   - Data and the operations on it are grouped together (the Grid type).
 *   - No global mutable state; everything is passed through parameters.
 *
 * The Rules of Life (B3/S23):
 *   1. A live cell with 2 or 3 live neighbours stays alive.
 *   2. A dead cell with exactly 3 live neighbours becomes alive.
 *   3. In all other cases a cell is dead in the next generation.
 *
 * Build:   cc -std=c11 -Wall -Wextra -o game_of_life game_of_life.c
 * Run:     ./game_of_life [rows] [cols] [generations]
 */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>

/* -------------------------------------------------------------------------
 * Constants and types
 * ------------------------------------------------------------------------- */

#define DEAD  0
#define ALIVE 1

#define DEFAULT_ROWS        20
#define DEFAULT_COLS        40
#define DEFAULT_GENERATIONS 30

/*
 * The Grid groups the board dimensions together with its cell storage.
 * Cells are stored in a single contiguous block addressed as cells[r * cols + c].
 */
typedef struct {
    int  rows;
    int  cols;
    int *cells;
} Grid;

/* -------------------------------------------------------------------------
 * Grid lifecycle
 * ------------------------------------------------------------------------- */

/*
 * Allocate a grid of the given size with every cell set to DEAD.
 * Returns 1 on success and 0 on failure. The grid is left in a defined
 * (empty) state on failure so the single exit point stays simple.
 */
static int grid_create(Grid *grid, int rows, int cols)
{
    int success = 0;

    grid->rows  = rows;
    grid->cols  = cols;
    grid->cells = calloc((size_t)rows * (size_t)cols, sizeof(int));

    if (grid->cells != NULL) {
        success = 1;
    }

    return success;
}

/*
 * Release the memory owned by a grid and reset it to an empty state.
 */
static void grid_destroy(Grid *grid)
{
    free(grid->cells);
    grid->cells = NULL;
    grid->rows  = 0;
    grid->cols  = 0;
}

/* -------------------------------------------------------------------------
 * Cell access helpers
 * ------------------------------------------------------------------------- */

/*
 * Return the state of a cell. Coordinates outside the grid are treated as
 * DEAD, which gives the board fixed (non-wrapping) borders.
 */
static int grid_get(const Grid *grid, int row, int col)
{
    int state = DEAD;

    if (row >= 0 && row < grid->rows && col >= 0 && col < grid->cols) {
        state = grid->cells[row * grid->cols + col];
    }

    return state;
}

/*
 * Set the state of a cell. Out-of-range coordinates are ignored.
 */
static void grid_set(Grid *grid, int row, int col, int state)
{
    if (row >= 0 && row < grid->rows && col >= 0 && col < grid->cols) {
        grid->cells[row * grid->cols + col] = state;
    }
}

/* -------------------------------------------------------------------------
 * Game rules
 * ------------------------------------------------------------------------- */

/*
 * Count the live cells in the eight-cell Moore neighbourhood of (row, col).
 */
static int count_live_neighbours(const Grid *grid, int row, int col)
{
    int count = 0;
    int dr;
    int dc;

    for (dr = -1; dr <= 1; dr++) {
        for (dc = -1; dc <= 1; dc++) {
            int is_self = (dr == 0 && dc == 0);

            if (!is_self) {
                count += grid_get(grid, row + dr, col + dc);
            }
        }
    }

    return count;
}

/*
 * Apply the B3/S23 rules to a single cell and return its next state.
 */
static int next_cell_state(int current_state, int live_neighbours)
{
    int next_state = DEAD;

    if (current_state == ALIVE) {
        if (live_neighbours == 2 || live_neighbours == 3) {
            next_state = ALIVE;
        }
    } else {
        if (live_neighbours == 3) {
            next_state = ALIVE;
        }
    }

    return next_state;
}

/*
 * Compute one generation. The next generation is written into 'next',
 * which must have the same dimensions as 'current'. Reading and writing
 * separate buffers keeps every cell update independent of evaluation order.
 */
static void evolve(const Grid *current, Grid *next)
{
    int row;
    int col;

    for (row = 0; row < current->rows; row++) {
        for (col = 0; col < current->cols; col++) {
            int neighbours = count_live_neighbours(current, row, col);
            int state      = next_cell_state(grid_get(current, row, col),
                                             neighbours);
            grid_set(next, row, col, state);
        }
    }
}

/* -------------------------------------------------------------------------
 * Presentation
 * ------------------------------------------------------------------------- */

/*
 * Print the grid to standard output. Live cells are shown as '#' and dead
 * cells as '.'. A header line identifies the current generation.
 */
static void grid_print(const Grid *grid, int generation)
{
    int row;
    int col;

    printf("Generation %d\n", generation);

    for (row = 0; row < grid->rows; row++) {
        for (col = 0; col < grid->cols; col++) {
            char symbol = (grid_get(grid, row, col) == ALIVE) ? '#' : '.';
            putchar(symbol);
        }
        putchar('\n');
    }

    putchar('\n');
}

/* -------------------------------------------------------------------------
 * Seeding the initial pattern
 * ------------------------------------------------------------------------- */

/*
 * Place a "glider" near the top-left corner. The glider is a classic
 * pattern that travels diagonally across the board.
 */
static void seed_glider(Grid *grid)
{
    grid_set(grid, 0, 1, ALIVE);
    grid_set(grid, 1, 2, ALIVE);
    grid_set(grid, 2, 0, ALIVE);
    grid_set(grid, 2, 1, ALIVE);
    grid_set(grid, 2, 2, ALIVE);
}

/* -------------------------------------------------------------------------
 * Argument parsing
 * ------------------------------------------------------------------------- */

/*
 * Read a positive integer from a command-line argument. If the text is not
 * a valid positive number the fallback value is returned instead, so the
 * program always continues with sensible settings.
 */
static int parse_positive_arg(const char *text, int fallback)
{
    int   value  = fallback;
    char *end     = NULL;
    long  parsed  = strtol(text, &end, 10);

    if (end != text && *end == '\0' && parsed > 0 && parsed <= 1000) {
        value = (int)parsed;
    }

    return value;
}

/* -------------------------------------------------------------------------
 * Simulation driver
 * ------------------------------------------------------------------------- */

/*
 * Run the simulation for the requested number of generations. The two grids
 * are swapped after each step so we reuse the buffers instead of allocating
 * new ones. Returns the number of generations actually displayed.
 */
static void run_simulation(Grid *grid, int generations)
{
    Grid scratch;
    int  generation;

    if (!grid_create(&scratch, grid->rows, grid->cols)) {
        fprintf(stderr, "Error: unable to allocate working grid.\n");
        return;
    }

    for (generation = 0; generation < generations; generation++) {
        Grid temp;

        grid_print(grid, generation);
        evolve(grid, &scratch);

        /* Swap the grids so 'grid' always holds the latest generation. */
        temp     = *grid;
        *grid    = scratch;
        scratch  = temp;
    }

    grid_destroy(&scratch);
}

/* -------------------------------------------------------------------------
 * Program entry point
 * ------------------------------------------------------------------------- */

int main(int argc, char *argv[])
{
    Grid grid;
    int  rows        = DEFAULT_ROWS;
    int  cols        = DEFAULT_COLS;
    int  generations = DEFAULT_GENERATIONS;
    int  exit_code   = EXIT_SUCCESS;

    if (argc > 1) {
        rows = parse_positive_arg(argv[1], DEFAULT_ROWS);
    }
    if (argc > 2) {
        cols = parse_positive_arg(argv[2], DEFAULT_COLS);
    }
    if (argc > 3) {
        generations = parse_positive_arg(argv[3], DEFAULT_GENERATIONS);
    }

    if (!grid_create(&grid, rows, cols)) {
        fprintf(stderr, "Error: unable to allocate %d x %d grid.\n",
                rows, cols);
        exit_code = EXIT_FAILURE;
    } else {
        seed_glider(&grid);
        run_simulation(&grid, generations);
        grid_destroy(&grid);
    }

    return exit_code;
}
