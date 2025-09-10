#nullable disable

namespace api.Entities
{
    public partial class Job
    {
        public long Id { get; set; }
        public string Queue { get; set; }
        public string Payload { get; set; }
        public byte Attempts { get; set; }
        public int? ReservedAt { get; set; }
        public int AvailableAt { get; set; }
        public int CreatedAt { get; set; }
    }
}
