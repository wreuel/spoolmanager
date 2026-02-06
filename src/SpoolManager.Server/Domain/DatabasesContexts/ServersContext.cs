using Microsoft.EntityFrameworkCore;

namespace SpoolManager.Server.Domain.DatabasesContexts
{
    public class SqlServerDbContext : SpoolManagerDbContext
    {
        public SqlServerDbContext(DbContextOptions<SqlServerDbContext> options)
            : base(options) { }
    }

    public class MySqlDbContext : SpoolManagerDbContext
    {
        public MySqlDbContext(DbContextOptions<MySqlDbContext> options)
            : base(options) { }
    }

}
